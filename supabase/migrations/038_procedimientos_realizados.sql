-- 038 · Procedimientos realizados: lo que el doctor hizo en una consulta.
--
-- Une plan, consulta y odontograma (hoja de ruta clínica, paso 2):
-- - Un procedimiento realizado pertenece a una consulta abierta del mismo paciente.
-- - Si viene del plan, completa el ítem (si no lo estaba). Un ítem admite un solo
--   procedimiento vigente; un ítem cancelado no admite ninguno.
-- - register_procedure() hace en un paso: hallazgo opcional en el odontograma
--   (en la misma consulta) + procedimiento + ítem del plan completado.
-- - No se edita: se anula con motivo. Al anularlo se anula también el hallazgo que
--   creó (salvo que ya tenga corrección). El ítem del plan sigue completado y admite
--   registrar el procedimiento de nuevo.
-- - Registra y anula solo el doctor; todos los roles clínicos y recepción leen.
--   Sin DELETE. Autor y fechas los pone la base.
-- - La nota va en el propio registro: no se duplica en clinical_entries.

create table public.procedures_performed (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.patients (id) on delete restrict,
  encounter_id            uuid not null references public.encounters (id) on delete restrict,
  treatment_plan_item_id  uuid references public.treatment_plan_items (id) on delete restrict,
  odontogram_entry_id     uuid unique references public.odontogram_entries (id) on delete restrict,
  procedure               text not null check (length(trim(procedure)) between 2 and 200),
  -- Diente FDI opcional (una limpieza general no lleva diente).
  tooth                   smallint check (
    tooth is null
    or (tooth / 10 between 1 and 4 and tooth % 10 between 1 and 8)
    or (tooth / 10 between 5 and 8 and tooth % 10 between 1 and 5)
  ),
  surfaces                text[] check (
    surfaces is null
    or (cardinality(surfaces) between 1 and 5 and surfaces <@ array['M', 'D', 'O', 'V', 'L'])
  ),
  note                    text check (note is null or length(note) <= 2000),
  performed_by            uuid references public.profiles (id) on delete restrict,
  performed_at            timestamptz not null default now(),
  voided_at               timestamptz,
  voided_by               uuid references public.profiles (id) on delete restrict,
  void_reason             text check (void_reason is null or length(void_reason) <= 500),
  clinic_id               uuid not null references public.clinics (id),
  constraint procedures_performed_surfaces check (surfaces is null or tooth is not null),
  constraint procedures_performed_void check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and length(trim(coalesce(void_reason, ''))) >= 5)
  )
);

create unique index procedures_performed_one_active_per_plan_item
  on public.procedures_performed (treatment_plan_item_id)
  where treatment_plan_item_id is not null and voided_at is null;
create index procedures_performed_patient_idx on public.procedures_performed (patient_id, performed_at);
create index procedures_performed_encounter_idx on public.procedures_performed (encounter_id);
create index procedures_performed_clinic_id_idx on public.procedures_performed (clinic_id);
create index procedures_performed_performed_by_idx on public.procedures_performed (performed_by);
create index procedures_performed_voided_by_idx on public.procedures_performed (voided_by);

-- ---------- Autoría, enlaces y anulación ----------
create or replace function public.stamp_procedure_performed()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan_patient uuid;
  v_plan_status public.treatment_status;
  v_plan_tooth smallint;
begin
  if tg_op = 'INSERT' then
    new.performed_by := auth.uid();
    new.performed_at := now();
    new.voided_at := null;
    new.voided_by := null;
    new.void_reason := null;

    if new.treatment_plan_item_id is not null then
      select t.patient_id, t.status, t.tooth into v_plan_patient, v_plan_status, v_plan_tooth
        from public.treatment_plan_items t where t.id = new.treatment_plan_item_id;
      if v_plan_patient is distinct from new.patient_id then
        raise exception 'El procedimiento del plan no es de este paciente.';
      end if;
      if v_plan_status = 'cancelado' then
        raise exception 'El procedimiento del plan está cancelado.';
      end if;
      if v_plan_tooth is not null and new.tooth is distinct from v_plan_tooth then
        raise exception 'El diente no coincide con el del plan.';
      end if;
    end if;

    -- El hallazgo enlazado lo acaba de registrar el mismo doctor en esta consulta.
    if new.odontogram_entry_id is not null and not exists (
      select 1 from public.odontogram_entries o
       where o.id = new.odontogram_entry_id
         and o.patient_id = new.patient_id
         and o.encounter_id = new.encounter_id
         and o.tooth = new.tooth
         and o.condition is not null
         and o.corrects_entry_id is null
         and o.author_id = auth.uid()
    ) then
      raise exception 'El hallazgo del odontograma no corresponde a este procedimiento.';
    end if;
    return new;
  end if;

  -- Solo se anula (una vez, con motivo).
  if old.voided_at is not null then
    raise exception 'Este procedimiento ya está anulado.';
  end if;
  if new.voided_at is null
     or new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.encounter_id is distinct from old.encounter_id
     or new.treatment_plan_item_id is distinct from old.treatment_plan_item_id
     or new.odontogram_entry_id is distinct from old.odontogram_entry_id
     or new.procedure is distinct from old.procedure
     or new.tooth is distinct from old.tooth
     or new.surfaces is distinct from old.surfaces
     or new.note is distinct from old.note
     or new.performed_by is distinct from old.performed_by
     or new.performed_at is distinct from old.performed_at then
    raise exception 'Un procedimiento registrado no se edita: anúlalo con motivo y regístralo de nuevo.';
  end if;
  new.voided_at := now();
  new.voided_by := auth.uid();
  return new;
end;
$$;
revoke all on function public.stamp_procedure_performed() from public, anon, authenticated;

-- Efectos: registrar completa el ítem del plan; anular anula el hallazgo creado.
-- Corre como el doctor (invoker): RLS y triggers de cada tabla siguen aplicando.
create or replace function public.procedure_performed_effects()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.treatment_plan_item_id is not null then
      update public.treatment_plan_items
         set status = 'completado'
       where id = new.treatment_plan_item_id
         and status <> 'completado';
    end if;
    return null;
  end if;

  if new.odontogram_entry_id is not null and not exists (
    select 1 from public.odontogram_entries o where o.corrects_entry_id = new.odontogram_entry_id
  ) then
    insert into public.odontogram_entries (patient_id, tooth, corrects_entry_id, correction_reason)
    values (new.patient_id, new.tooth, new.odontogram_entry_id,
            left('Procedimiento anulado: ' || new.void_reason, 500));
  end if;
  return null;
end;
$$;
revoke all on function public.procedure_performed_effects() from public, anon, authenticated;

create trigger a0_set_clinic_id before insert or update on public.procedures_performed
  for each row execute function public.set_clinic_id();
create trigger b_check_encounter before insert or update on public.procedures_performed
  for each row execute function public.check_encounter_link();
create trigger procedures_performed_stamp before insert or update on public.procedures_performed
  for each row execute function public.stamp_procedure_performed();
create trigger procedures_performed_effects after insert or update on public.procedures_performed
  for each row execute function public.procedure_performed_effects();
create trigger procedures_performed_audit after insert or update or delete on public.procedures_performed
  for each row execute function public.audit_row();
create trigger block_truncate before truncate on public.procedures_performed
  for each statement execute function public.block_truncate();

-- ---------- Permisos ----------
alter table public.procedures_performed enable row level security;

create policy "aislamiento por clínica" on public.procedures_performed as restrictive to authenticated
  using (clinic_id = (select public.get_my_clinic()))
  with check (clinic_id = (select public.get_my_clinic()));

-- Recepción lee: es quien cobra lo realizado.
create policy "procedures_performed: ver" on public.procedures_performed for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = procedures_performed.patient_id)
  );

create policy "procedures_performed: doctor registra" on public.procedures_performed for insert to authenticated
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = procedures_performed.patient_id)
  );

create policy "procedures_performed: doctor anula" on public.procedures_performed for update to authenticated
  using (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = procedures_performed.patient_id)
  )
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = procedures_performed.patient_id)
  );

grant select, insert, update on public.procedures_performed to authenticated;

-- ---------- Registro en un paso ----------
-- El paciente sale de la consulta. Con ítem del plan: procedimiento, diente y
-- superficies salen del plan si no se indican (las superficies pueden cambiar;
-- el diente no). Con condición: crea el hallazgo en la misma consulta.
-- Invoker: aplica RLS y los triggers de cada tabla; todo o nada.
create or replace function public.register_procedure(
  p_encounter_id uuid,
  p_treatment_plan_item_id uuid default null,
  p_procedure text default null,
  p_tooth integer default null,
  p_surfaces text[] default null,
  p_note text default null,
  p_odontogram_condition public.odontogram_condition default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_patient uuid;
  v_procedure text := nullif(trim(p_procedure), '');
  v_tooth smallint := p_tooth;
  v_surfaces text[] := nullif(p_surfaces, '{}');
  v_plan_patient uuid;
  v_plan_procedure text;
  v_plan_tooth smallint;
  v_plan_surfaces text[];
  v_surface_condition boolean := p_odontogram_condition in ('caries', 'obturacion', 'sellante');
  v_finding uuid;
  v_id uuid;
begin
  if (select public.get_my_role()) is distinct from 'doctor' then
    raise exception 'Solo el doctor registra procedimientos realizados.';
  end if;

  select e.patient_id into v_patient from public.encounters e where e.id = p_encounter_id;
  if v_patient is null then
    raise exception 'No se encontró la consulta.';
  end if;

  if p_treatment_plan_item_id is not null then
    select t.patient_id, t.procedure, t.tooth, t.surfaces
      into v_plan_patient, v_plan_procedure, v_plan_tooth, v_plan_surfaces
      from public.treatment_plan_items t where t.id = p_treatment_plan_item_id;
    if v_plan_patient is distinct from v_patient then
      raise exception 'El procedimiento del plan no es de este paciente.';
    end if;
    v_procedure := coalesce(v_procedure, v_plan_procedure);
    v_tooth := coalesce(v_tooth, v_plan_tooth);
    v_surfaces := coalesce(v_surfaces, v_plan_surfaces);
  end if;

  if v_procedure is null then
    raise exception 'Escribe el procedimiento realizado.';
  end if;

  if p_odontogram_condition is not null then
    if v_tooth is null then
      raise exception 'Para registrar en el odontograma, indica el diente.';
    end if;
    if v_surface_condition and v_surfaces is null then
      raise exception 'Para esa condición del odontograma faltan las superficies.';
    end if;
    insert into public.odontogram_entries (patient_id, tooth, surfaces, condition, note, encounter_id)
    values (v_patient, v_tooth, case when v_surface_condition then v_surfaces end,
            p_odontogram_condition, left('Procedimiento: ' || v_procedure, 500), p_encounter_id)
    returning id into v_finding;
  end if;

  insert into public.procedures_performed
    (patient_id, encounter_id, treatment_plan_item_id, odontogram_entry_id, procedure, tooth, surfaces, note)
  values
    (v_patient, p_encounter_id, p_treatment_plan_item_id, v_finding, v_procedure, v_tooth, v_surfaces,
     nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.register_procedure(uuid, uuid, text, integer, text[], text, public.odontogram_condition)
  from public, anon;
grant execute on function public.register_procedure(uuid, uuid, text, integer, text[], text, public.odontogram_condition)
  to authenticated;
