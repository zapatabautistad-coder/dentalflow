-- 036 · IA ambiental: consentimiento, sesiones y borradores (pendientes/18-ia-ambiental.md).
--
-- La IA propone y el doctor firma: la IA solo escribe en ai_drafts. Lo que el doctor acepta
-- se guarda con el flujo normal en la tabla clínica, marcado source = 'ia_confirmada'.
-- Sin DELETE. Autor y fechas los pone la base. Aislamiento por clínica como el resto.

create type public.ai_consent_scope as enum ('dictado', 'procesamiento_ia');
create type public.ai_draft_kind as enum ('odontograma', 'nota', 'signos', 'plan', 'pregunta');
create type public.ai_draft_status as enum ('propuesto', 'aceptado', 'rechazado');
create type public.record_source as enum ('manual', 'ia_confirmada');

-- ---------- Consentimiento (solo INSERT; revocar = fila nueva con granted = false) ----------
create table public.ai_consents (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete restrict,
  scope        public.ai_consent_scope not null,
  granted      boolean not null,
  note         text check (note is null or length(note) <= 500),
  recorded_by  uuid references public.profiles (id) on delete restrict,
  recorded_at  timestamptz not null default now(),
  clinic_id    uuid not null references public.clinics (id)
);
create index ai_consents_patient_idx on public.ai_consents (patient_id, scope, recorded_at desc);
create index ai_consents_clinic_id_idx on public.ai_consents (clinic_id);
create index ai_consents_recorded_by_idx on public.ai_consents (recorded_by);

create or replace function public.stamp_ai_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.recorded_by := auth.uid();
  new.recorded_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.stamp_ai_consent() from public, anon, authenticated;

-- Consentimiento vigente = el último registrado para ese alcance. Invoker: respeta RLS.
create or replace function public.ai_consent_active(p_patient uuid, p_scope public.ai_consent_scope)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select c.granted from public.ai_consents c
     where c.patient_id = p_patient and c.scope = p_scope
     order by c.recorded_at desc, c.id desc
     limit 1), false);
$$;
revoke all on function public.ai_consent_active(uuid, public.ai_consent_scope) from public, anon;
grant execute on function public.ai_consent_active(uuid, public.ai_consent_scope) to authenticated;

-- ---------- Sesiones de IA (una por uso dentro de una consulta abierta) ----------
create table public.ai_sessions (
  id                  uuid primary key default gen_random_uuid(),
  encounter_id        uuid not null references public.encounters (id) on delete restrict,
  patient_id          uuid not null references public.patients (id) on delete restrict,
  user_id             uuid references public.profiles (id) on delete restrict,
  model               text not null check (length(model) between 3 and 100),
  input_tokens        integer not null default 0 check (input_tokens >= 0),
  output_tokens       integer not null default 0 check (output_tokens >= 0),
  cache_read_tokens   integer not null default 0 check (cache_read_tokens >= 0),
  cache_write_tokens  integer not null default 0 check (cache_write_tokens >= 0),
  cost_usd            numeric(10,4) not null default 0 check (cost_usd >= 0),
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  clinic_id           uuid not null references public.clinics (id)
);
create index ai_sessions_encounter_idx on public.ai_sessions (encounter_id);
create index ai_sessions_patient_idx on public.ai_sessions (patient_id);
create index ai_sessions_user_idx on public.ai_sessions (user_id);
create index ai_sessions_clinic_started_idx on public.ai_sessions (clinic_id, started_at);

create or replace function public.stamp_ai_session()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_patient uuid;
  v_status public.encounter_status;
begin
  if tg_op = 'INSERT' then
    select e.patient_id, e.status into v_patient, v_status
      from public.encounters e where e.id = new.encounter_id;
    if v_patient is distinct from new.patient_id then
      raise exception 'La consulta no es de este paciente.';
    end if;
    if v_status <> 'abierta' then
      raise exception 'La consulta está cerrada: no admite sesiones de IA.';
    end if;
    if not public.ai_consent_active(new.patient_id, 'procesamiento_ia') then
      raise exception 'El paciente no ha dado consentimiento para procesamiento con IA.';
    end if;
    new.user_id := auth.uid();
    new.started_at := clock_timestamp();
    new.ended_at := null;
    new.input_tokens := 0;
    new.output_tokens := 0;
    new.cache_read_tokens := 0;
    new.cache_write_tokens := 0;
    new.cost_usd := 0;
    return new;
  end if;

  if old.ended_at is not null then
    raise exception 'La sesión de IA ya terminó y no se modifica.';
  end if;
  if new.encounter_id is distinct from old.encounter_id
     or new.user_id is distinct from old.user_id
     or new.model is distinct from old.model
     or new.started_at is distinct from old.started_at then
    raise exception 'De una sesión de IA solo cambian el consumo y el fin.';
  end if;
  -- El consumo solo sube: nadie puede bajar su uso para saltarse el límite.
  if new.input_tokens < old.input_tokens or new.output_tokens < old.output_tokens
     or new.cache_read_tokens < old.cache_read_tokens
     or new.cache_write_tokens < old.cache_write_tokens
     or new.cost_usd < old.cost_usd then
    raise exception 'El consumo de una sesión de IA no puede bajar.';
  end if;
  if new.ended_at is not null then
    new.ended_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_ai_session() from public, anon, authenticated;

-- ---------- Borradores de la IA ----------
create table public.ai_drafts (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.ai_sessions (id) on delete restrict,
  encounter_id        uuid not null references public.encounters (id) on delete restrict,
  patient_id          uuid not null references public.patients (id) on delete restrict,
  kind                public.ai_draft_kind not null,
  payload             jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384),
  status              public.ai_draft_status not null default 'propuesto',
  accepted_record_id  uuid,
  decision_note       text check (decision_note is null or length(decision_note) <= 500),
  created_at          timestamptz not null default now(),
  decided_by          uuid references public.profiles (id) on delete restrict,
  decided_at          timestamptz,
  clinic_id           uuid not null references public.clinics (id),
  constraint ai_drafts_decided_consistent check ((status = 'propuesto') = (decided_at is null)),
  constraint ai_drafts_record_only_if_accepted check (accepted_record_id is null or status = 'aceptado')
);
create index ai_drafts_session_idx on public.ai_drafts (session_id);
create index ai_drafts_encounter_idx on public.ai_drafts (encounter_id, status);
create index ai_drafts_patient_idx on public.ai_drafts (patient_id);
create index ai_drafts_clinic_id_idx on public.ai_drafts (clinic_id);
create index ai_drafts_decided_by_idx on public.ai_drafts (decided_by);

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
revoke all on function public.stamp_ai_draft() from public, anon, authenticated;

-- ---------- Triggers comunes ----------
create trigger a0_set_clinic_id before insert or update on public.ai_consents
  for each row execute function public.set_clinic_id();
create trigger ai_consents_stamp before insert on public.ai_consents
  for each row execute function public.stamp_ai_consent();
create trigger ai_consents_audit after insert or update or delete on public.ai_consents
  for each row execute function public.audit_row();

create trigger a0_set_clinic_id before insert or update on public.ai_sessions
  for each row execute function public.set_clinic_id();
create trigger ai_sessions_stamp before insert or update on public.ai_sessions
  for each row execute function public.stamp_ai_session();
create trigger ai_sessions_audit after insert or update or delete on public.ai_sessions
  for each row execute function public.audit_row();

create trigger a0_set_clinic_id before insert or update on public.ai_drafts
  for each row execute function public.set_clinic_id();
create trigger ai_drafts_stamp before insert or update on public.ai_drafts
  for each row execute function public.stamp_ai_draft();
create trigger ai_drafts_audit after insert or update or delete on public.ai_drafts
  for each row execute function public.audit_row();

do $$
declare
  v_table text;
begin
  foreach v_table in array array['ai_consents', 'ai_sessions', 'ai_drafts'] loop
    execute format(
      'create trigger block_truncate before truncate on public.%I for each statement execute function public.block_truncate()',
      v_table);
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'create policy "aislamiento por clínica" on public.%I as restrictive to authenticated '
      'using (clinic_id = (select public.get_my_clinic())) with check (clinic_id = (select public.get_my_clinic()))',
      v_table);
  end loop;
end;
$$;

-- ---------- Políticas ----------
create policy "ai_consents: ver" on public.ai_consents for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_consents.patient_id)
  );
create policy "ai_consents: registrar" on public.ai_consents for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_consents.patient_id)
  );

-- Admin ve sesiones (consumo y costo); no ve borradores (contenido clínico de la IA).
create policy "ai_sessions: ver" on public.ai_sessions for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_sessions.patient_id)
  );
create policy "ai_sessions: iniciar" on public.ai_sessions for insert to authenticated
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_sessions.patient_id)
  );
create policy "ai_sessions: dueño registra consumo" on public.ai_sessions for update to authenticated
  using ((select public.get_my_role()) in ('doctor', 'enfermeria') and user_id = (select auth.uid()))
  with check ((select public.get_my_role()) in ('doctor', 'enfermeria') and user_id = (select auth.uid()));

create policy "ai_drafts: ver" on public.ai_drafts for select to authenticated
  using (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_drafts.patient_id)
  );
create policy "ai_drafts: proponer" on public.ai_drafts for insert to authenticated
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_drafts.patient_id)
  );
create policy "ai_drafts: decidir" on public.ai_drafts for update to authenticated
  using (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_drafts.patient_id)
  )
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = ai_drafts.patient_id)
  );

grant select, insert on public.ai_consents to authenticated;
grant select, insert, update on public.ai_sessions to authenticated;
grant select, insert, update on public.ai_drafts to authenticated;

-- ---------- Origen del registro clínico ----------
-- Tablas solo INSERT: el origen no cambia nunca. 'ia_confirmada' exige consulta enlazada.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['clinical_entries', 'odontogram_entries', 'vital_signs'] loop
    execute format(
      'alter table public.%I add column source public.record_source not null default ''manual''',
      v_table);
    execute format(
      'alter table public.%I add constraint %I check (source = ''manual'' or encounter_id is not null)',
      v_table, v_table || '_ia_needs_encounter');
  end loop;
end;
$$;
