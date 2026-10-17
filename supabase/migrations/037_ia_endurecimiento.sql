-- 037 · IA: aceptar un borrador es atómico y la etiqueta 'ia_confirmada' no se falsifica.
--
-- - ai_accept_draft(): en una transacción crea el registro clínico desde el borrador
--   (o la versión editada) y lo marca aceptado. Es la única vía para aceptar.
-- - Un INSERT con source = 'ia_confirmada' fuera de ai_accept_draft() se rechaza.
-- - Una consulta con borradores sin decidir no se cierra (cerrada ya no se podrían aceptar).
-- - Un registro clínico respalda un solo borrador; una toma de signos vitales admite
--   una sola corrección (como notas y odontograma).
-- - create_prescription() acepta la consulta (p_encounter_id, opcional).

-- ---------- Unicidad ----------
create unique index ai_drafts_one_per_record on public.ai_drafts (accepted_record_id)
  where accepted_record_id is not null;

create unique index vital_signs_one_correction on public.vital_signs (corrects_entry_id)
  where corrects_entry_id is not null;
drop index if exists public.vital_signs_corrects_idx;

-- ---------- Marca de transacción de ai_accept_draft() ----------
-- 'dentalflow.ia_confirmada' = 'on' solo dentro de ai_accept_draft() (set_config local,
-- se apaga al terminar). Desde la API no se puede fijar: set_config no está expuesta.
create or replace function public.check_ia_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source = 'ia_confirmada'
     and coalesce(current_setting('dentalflow.ia_confirmada', true), '') <> 'on' then
    raise exception 'Un registro de la IA solo se crea al aceptar su borrador.';
  end if;
  return new;
end;
$$;
revoke all on function public.check_ia_source() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['clinical_entries', 'odontogram_entries', 'vital_signs'] loop
    execute format(
      'create trigger c_check_ia_source before insert on public.%I for each row execute function public.check_ia_source()',
      v_table);
  end loop;
end;
$$;

-- ---------- Borradores: aceptar solo con ai_accept_draft() ----------
-- Igual que en la 036, más la marca de transacción para aceptar.
create or replace function public.stamp_ai_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  if tg_op = 'INSERT' then
    -- Solo el dueño de una sesión activa de la misma consulta y paciente.
    if not exists (
      select 1 from public.ai_sessions s
       where s.id = new.session_id
         and s.user_id = auth.uid()
         and s.ended_at is null
         and s.encounter_id = new.encounter_id
         and s.patient_id = new.patient_id
    ) then
      raise exception 'El borrador debe pertenecer a una sesión de IA activa propia de esta consulta.';
    end if;
    if not exists (select 1 from public.encounters e where e.id = new.encounter_id and e.status = 'abierta') then
      raise exception 'La consulta está cerrada: no admite borradores.';
    end if;
    new.status := 'propuesto';
    new.accepted_record_id := null;
    new.decision_note := null;
    new.decided_by := null;
    new.decided_at := null;
    new.created_at := clock_timestamp();
    return new;
  end if;

  if old.status <> 'propuesto' then
    raise exception 'El borrador ya fue decidido y no se modifica.';
  end if;
  if new.status = 'propuesto' then
    raise exception 'Un borrador solo se acepta o se rechaza.';
  end if;
  if new.session_id is distinct from old.session_id
     or new.encounter_id is distinct from old.encounter_id
     or new.kind is distinct from old.kind
     or new.payload is distinct from old.payload
     or new.created_at is distinct from old.created_at then
    raise exception 'Al decidir un borrador solo cambian el estado, la nota y el registro aceptado.';
  end if;
  -- Firma: el doctor decide todo; el asistente dental solo signos vitales.
  if (select public.get_my_role()) <> 'doctor'
     and not ((select public.get_my_role()) = 'enfermeria' and old.kind = 'signos') then
    raise exception 'Solo el doctor decide este borrador.';
  end if;
  if new.status = 'aceptado'
     and coalesce(current_setting('dentalflow.ia_confirmada', true), '') <> 'on' then
    raise exception 'Un borrador se acepta con ai_accept_draft().';
  end if;
  -- Aceptar exige el registro creado en la tabla clínica, de la misma consulta.
  if new.status = 'aceptado' and old.kind <> 'pregunta' then
    if new.accepted_record_id is null then
      raise exception 'Para aceptar un borrador hay que indicar el registro creado.';
    end if;
    v_ok := case old.kind
      when 'odontograma' then exists (select 1 from public.odontogram_entries r
        where r.id = new.accepted_record_id and r.encounter_id = old.encounter_id and r.source = 'ia_confirmada')
      when 'nota' then exists (select 1 from public.clinical_entries r
        where r.id = new.accepted_record_id and r.encounter_id = old.encounter_id and r.source = 'ia_confirmada')
      when 'signos' then exists (select 1 from public.vital_signs r
        where r.id = new.accepted_record_id and r.encounter_id = old.encounter_id and r.source = 'ia_confirmada')
      when 'plan' then exists (select 1 from public.treatment_plan_items r
        where r.id = new.accepted_record_id and r.patient_id = old.patient_id)
    end;
    if not v_ok then
      raise exception 'El registro aceptado no corresponde a este borrador.';
    end if;
  elsif new.accepted_record_id is not null then
    raise exception 'Una pregunta o un rechazo no llevan registro.';
  end if;
  new.decided_by := auth.uid();
  new.decided_at := clock_timestamp();
  return new;
end;
$$;

-- Crea el registro clínico y acepta el borrador, todo o nada. p_edited = versión
-- corregida por quien firma (mismo formato que payload); el borrador conserva lo
-- que propuso la IA. Invoker: aplican RLS, triggers y checks de cada tabla.
create or replace function public.ai_accept_draft(p_draft_id uuid, p_edited jsonb default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_kind public.ai_draft_kind;
  v_status public.ai_draft_status;
  v_patient uuid;
  v_encounter uuid;
  v_payload jsonb;
  v_role public.user_role := (select public.get_my_role());
  v_record uuid;
begin
  select d.kind, d.status, d.patient_id, d.encounter_id, coalesce(p_edited, d.payload)
    into v_kind, v_status, v_patient, v_encounter, v_payload
    from public.ai_drafts d where d.id = p_draft_id
    for update;
  if not found then
    raise exception 'No se encontró el borrador.';
  end if;
  if v_status <> 'propuesto' then
    raise exception 'El borrador ya fue decidido y no se modifica.';
  end if;
  if v_role is distinct from 'doctor' and not (v_role = 'enfermeria' and v_kind = 'signos') then
    raise exception 'Solo el doctor decide este borrador.';
  end if;
  if jsonb_typeof(v_payload) is distinct from 'object' then
    raise exception 'El contenido del borrador no es válido.';
  end if;

  perform set_config('dentalflow.ia_confirmada', 'on', true);

  case v_kind
    when 'odontograma' then
      insert into public.odontogram_entries (patient_id, tooth, surfaces, condition, note, encounter_id, source)
      values (
        v_patient,
        (v_payload ->> 'tooth')::smallint,
        case when jsonb_typeof(v_payload -> 'surfaces') = 'array' and jsonb_array_length(v_payload -> 'surfaces') > 0
             then array(select jsonb_array_elements_text(v_payload -> 'surfaces')) end,
        (v_payload ->> 'condition')::public.odontogram_condition,
        nullif(trim(v_payload ->> 'note'), ''),
        v_encounter, 'ia_confirmada')
      returning id into v_record;
    when 'nota' then
      insert into public.clinical_entries (patient_id, kind, body, encounter_id, source)
      values (v_patient, 'nota', trim(v_payload ->> 'body'), v_encounter, 'ia_confirmada')
      returning id into v_record;
    when 'signos' then
      insert into public.vital_signs
        (patient_id, systolic, diastolic, heart_rate, glucose_mg_dl, oxygen_saturation, note, encounter_id, source)
      values (
        v_patient,
        (v_payload ->> 'systolic')::smallint,
        (v_payload ->> 'diastolic')::smallint,
        (v_payload ->> 'heart_rate')::smallint,
        (v_payload ->> 'glucose_mg_dl')::smallint,
        (v_payload ->> 'oxygen_saturation')::smallint,
        nullif(trim(v_payload ->> 'note'), ''),
        v_encounter, 'ia_confirmada')
      returning id into v_record;
    when 'plan' then
      insert into public.treatment_plan_items (patient_id, procedure, tooth, surfaces, note)
      values (
        v_patient,
        trim(v_payload ->> 'procedure'),
        (v_payload ->> 'tooth')::smallint,
        case when jsonb_typeof(v_payload -> 'surfaces') = 'array' and jsonb_array_length(v_payload -> 'surfaces') > 0
             then array(select jsonb_array_elements_text(v_payload -> 'surfaces')) end,
        nullif(trim(v_payload ->> 'note'), ''))
      returning id into v_record;
    else
      v_record := null;  -- pregunta: aceptar = leída por quien firma
  end case;

  update public.ai_drafts
     set status = 'aceptado',
         accepted_record_id = v_record,
         decision_note = case when p_edited is not null then 'Editado antes de aceptar' end
   where id = p_draft_id;

  perform set_config('dentalflow.ia_confirmada', '', true);
  return v_record;
end;
$$;
revoke all on function public.ai_accept_draft(uuid, jsonb) from public, anon;
grant execute on function public.ai_accept_draft(uuid, jsonb) to authenticated;

-- ---------- Consulta: no se cierra con borradores sin decidir ----------
-- Igual que en la 035, más la revisión de borradores.
create or replace function public.stamp_encounter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'abierta';
    new.opened_by := auth.uid();
    new.opened_by_role := (select public.get_my_role());
    new.opened_at := now();
    new.closed_by := null;
    new.closed_at := null;
    new.closure_note := null;
    return new;
  end if;

  if old.status = 'cerrada' then
    raise exception 'La consulta ya está cerrada y no se modifica.';
  end if;
  if new.status <> 'cerrada' then
    raise exception 'Una consulta abierta solo se puede cerrar.';
  end if;
  if new.patient_id is distinct from old.patient_id
     or new.appointment_id is distinct from old.appointment_id
     or new.reason is distinct from old.reason
     or new.opened_by is distinct from old.opened_by
     or new.opened_by_role is distinct from old.opened_by_role
     or new.opened_at is distinct from old.opened_at then
    raise exception 'Al cerrar una consulta solo se agrega la nota de cierre.';
  end if;
  if exists (select 1 from public.ai_drafts d where d.encounter_id = old.id and d.status = 'propuesto') then
    raise exception 'La consulta tiene borradores de la IA sin decidir: acéptalos o recházalos antes de cerrarla.';
  end if;
  new.closed_by := auth.uid();
  new.closed_at := now();
  return new;
end;
$$;

-- ---------- Recetas en la consulta ----------
-- Nueva firma con p_encounter_id al final (opcional): las llamadas con nombre siguen
-- igual. check_encounter_link valida paciente y consulta abierta.
drop function public.create_prescription(uuid, jsonb, text, uuid);

create function public.create_prescription(
  p_patient_id uuid,
  p_items jsonb,
  p_indications text default null,
  p_appointment_id uuid default null,
  p_encounter_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_item jsonb;
  v_position smallint := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La receta necesita al menos un medicamento.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Una receta admite hasta 20 medicamentos.';
  end if;

  insert into public.prescriptions (patient_id, appointment_id, encounter_id, indications)
  values (p_patient_id, p_appointment_id, p_encounter_id, nullif(trim(p_indications), ''))
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    insert into public.prescription_items
      (prescription_id, position, medication, dose, frequency, duration, quantity, instructions)
    values (
      v_id, v_position,
      trim(v_item ->> 'medication'),
      nullif(trim(v_item ->> 'dose'), ''),
      nullif(trim(v_item ->> 'frequency'), ''),
      nullif(trim(v_item ->> 'duration'), ''),
      nullif(trim(v_item ->> 'quantity'), ''),
      nullif(trim(v_item ->> 'instructions'), '')
    );
  end loop;

  return v_id;
end;
$$;
revoke all on function public.create_prescription(uuid, jsonb, text, uuid, uuid) from public, anon;
grant execute on function public.create_prescription(uuid, jsonb, text, uuid, uuid) to authenticated;
