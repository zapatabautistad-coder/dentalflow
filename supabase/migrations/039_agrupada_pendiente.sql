-- 039 · Migración agrupada pendiente (NO APLICADA).
--
-- Regla de Darys (2026-10-17): una sola migración por bloque de trabajo. Este archivo
-- se EDITA mientras no esté en producción; no crear 040 hasta aplicar este.
-- Antes de aplicar: probar en local (npm run test:e2e:setup), npm run db:types,
-- npm run db:schema, actualizar supabase/MAPA.md y el "Estado" de CLAUDE.md.
--
-- Contenido actual (huecos detectados al comparar con el prompt maestro de OrthoLimb):
-- A. Auditoría a prueba de manipulación: cadena de hashes por clínica en audit_log
--    y bloqueo de UPDATE/DELETE para cualquier rol (incluido service_role).
-- B. Responsables del menor (patient_guardians), ya previsto en pendientes/05.
-- C. Solicitudes de derechos del titular (Ley 172-13): acceso, rectificación,
--    cancelación, oposición. Plazos legales: LEGAL_REVIEW_REQUIRED (no se fijan aquí).
--
-- Pendiente de agregar AQUÍ (no en otra migración): enlace cargo ↔ procedimiento
-- para "producción por doctor" (pendientes/19-mejoras-interfaz.md).

-- =====================================================================
-- A. Auditoría encadenada
-- =====================================================================
-- Las filas existentes quedan sin hash (historial previo). La cadena de cada
-- clínica empieza en su primer evento posterior a esta migración (prev_hash nulo).

alter table public.audit_log
  add column chain_seq bigint,
  add column prev_hash bytea,
  add column row_hash  bytea;

create unique index audit_log_chain_idx on public.audit_log (clinic_id, chain_seq)
  where chain_seq is not null;

-- Huella de una fila: algoritmo fijo y versionado (v1 = sha256 sobre texto canónico).
-- quote_nullable distingue NULL de texto vacío.
create or replace function public.audit_row_digest_v1(
  p_prev bytea, p_seq bigint, p_table text, p_record uuid, p_patient uuid,
  p_action text, p_by uuid, p_at timestamptz, p_old jsonb, p_new jsonb, p_clinic uuid)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select sha256(convert_to(concat_ws('|',
    'v1',
    quote_nullable(encode(p_prev, 'hex')),
    quote_nullable(p_seq),
    quote_nullable(p_table),
    quote_nullable(p_record),
    quote_nullable(p_patient),
    quote_nullable(p_action),
    quote_nullable(p_by),
    quote_nullable(to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')),
    quote_nullable(p_old::text),
    quote_nullable(p_new::text),
    quote_nullable(p_clinic)), 'UTF8'));
$$;
revoke all on function public.audit_row_digest_v1(bytea, bigint, text, uuid, uuid, text, uuid, timestamptz, jsonb, jsonb, uuid)
  from public, anon, authenticated;

-- Encadena cada evento nuevo. El candado por clínica serializa la cadena aunque
-- los id de la secuencia lleguen desordenados entre transacciones.
create or replace function public.audit_chain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev_seq  bigint;
  v_prev_hash bytea;
begin
  perform pg_advisory_xact_lock(hashtextextended('audit_chain:' || new.clinic_id::text, 0));

  select a.chain_seq, a.row_hash into v_prev_seq, v_prev_hash
    from public.audit_log a
   where a.clinic_id = new.clinic_id and a.chain_seq is not null
   order by a.chain_seq desc
   limit 1;

  new.changed_at := clock_timestamp();
  new.chain_seq  := coalesce(v_prev_seq, 0) + 1;
  new.prev_hash  := v_prev_hash;
  new.row_hash   := public.audit_row_digest_v1(
    new.prev_hash, new.chain_seq, new.table_name, new.record_id, new.patient_id,
    new.action, new.changed_by, new.changed_at, new.old_data, new.new_data, new.clinic_id);
  return new;
end;
$$;
revoke all on function public.audit_chain() from public, anon, authenticated;

create trigger a0_audit_chain before insert on public.audit_log
  for each row execute function public.audit_chain();

-- audit_log no se modifica ni se borra, ni siquiera con service_role.
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log es solo de inserción: no se puede %.', lower(tg_op);
end;
$$;
revoke all on function public.audit_log_immutable() from public, anon, authenticated;

create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- Verificación: recalcula la cadena de la clínica del usuario.
-- Solo admin de la clínica o dueño de plataforma. Devuelve el primer eslabón roto.
create or replace function public.audit_verify_chain(p_clinic uuid default null)
returns table (ok boolean, checked bigint, first_broken_seq bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic uuid := coalesce(p_clinic, public.get_my_clinic());
  v_prev   bytea := null;
  v_count  bigint := 0;
  r        record;
begin
  if not (public.is_platform_admin()
          or (public.get_my_role() = 'admin' and v_clinic = public.get_my_clinic())) then
    raise exception 'No autorizado.';
  end if;

  for r in
    select * from public.audit_log a
     where a.clinic_id = v_clinic and a.chain_seq is not null
     order by a.chain_seq
  loop
    v_count := v_count + 1;
    if r.chain_seq <> v_count
       or r.prev_hash is distinct from v_prev
       or r.row_hash <> public.audit_row_digest_v1(
            r.prev_hash, r.chain_seq, r.table_name, r.record_id, r.patient_id,
            r.action, r.changed_by, r.changed_at, r.old_data, r.new_data, r.clinic_id) then
      return query select false, v_count, r.chain_seq;
      return;
    end if;
    v_prev := r.row_hash;
  end loop;

  return query select true, v_count, null::bigint;
end;
$$;
revoke all on function public.audit_verify_chain(uuid) from public, anon;
grant execute on function public.audit_verify_chain(uuid) to authenticated;

-- =====================================================================
-- B. Responsables del menor
-- =====================================================================
-- No se borra: se desactiva con motivo. Los datos del responsable no se editan;
-- un error se corrige desactivando y registrando otro.
-- Validez legal del consentimiento del representante: LEGAL_REVIEW_REQUIRED.

create table public.patient_guardians (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients (id) on delete restrict,
  full_name       text not null check (length(trim(full_name)) between 3 and 150),
  relationship    text not null check (relationship in
                    ('madre', 'padre', 'tutor_legal', 'abuelo', 'hermano', 'otro')),
  phone           text check (phone is null or length(phone) between 7 and 20),
  id_document     text check (id_document is null or length(id_document) between 5 and 30),
  can_consent     boolean not null default false,
  is_active       boolean not null default true,
  ended_reason    text check (ended_reason is null or length(trim(ended_reason)) between 3 and 300),
  ended_by        uuid references public.profiles (id) on delete restrict,
  ended_at        timestamptz,
  recorded_by     uuid references public.profiles (id) on delete restrict,
  recorded_at     timestamptz not null default now(),
  clinic_id       uuid not null references public.clinics (id),
  constraint patient_guardians_end_check check (
    (is_active and ended_reason is null and ended_at is null)
    or (not is_active and ended_reason is not null and ended_at is not null))
);
create index patient_guardians_patient_idx on public.patient_guardians (patient_id) where is_active;
create index patient_guardians_clinic_id_idx on public.patient_guardians (clinic_id);
create index patient_guardians_recorded_by_idx on public.patient_guardians (recorded_by);
create index patient_guardians_ended_by_idx on public.patient_guardians (ended_by);

create or replace function public.stamp_patient_guardian()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.recorded_by  := auth.uid();
    new.recorded_at  := clock_timestamp();
    new.is_active    := true;
    new.ended_reason := null;
    new.ended_by     := null;
    new.ended_at     := null;
    return new;
  end if;

  -- UPDATE: solo desactivar, una vez.
  if not old.is_active then
    raise exception 'Este responsable ya está desactivado.';
  end if;
  if new.is_active
     or (to_jsonb(new) - array['is_active', 'ended_reason', 'ended_by', 'ended_at'])
        is distinct from (to_jsonb(old) - array['is_active', 'ended_reason', 'ended_by', 'ended_at']) then
    raise exception 'Un responsable no se edita: se desactiva con motivo y se registra otro.';
  end if;
  new.ended_by := auth.uid();
  new.ended_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.stamp_patient_guardian() from public, anon, authenticated;

-- =====================================================================
-- C. Derechos del titular (Ley 172-13)
-- =====================================================================
-- Registro de solicitudes y su respuesta. No ejecuta borrados: la cancelación de
-- datos clínicos choca con la conservación obligatoria del expediente
-- (LEGAL_REVIEW_REQUIRED); la respuesta se documenta aquí.

create table public.data_subject_requests (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients (id) on delete restrict,
  request_type    text not null check (request_type in
                    ('acceso', 'rectificacion', 'cancelacion', 'oposicion', 'portabilidad')),
  requested_by    text not null check (requested_by in ('titular', 'representante')),
  channel         text not null check (channel in ('presencial', 'correo', 'telefono', 'otro')),
  details         text check (details is null or length(details) <= 2000),
  status          text not null default 'recibida' check (status in
                    ('recibida', 'en_proceso', 'respondida', 'rechazada')),
  response_note   text check (response_note is null or length(response_note) <= 2000),
  received_by     uuid references public.profiles (id) on delete restrict,
  received_at     timestamptz not null default now(),
  resolved_by     uuid references public.profiles (id) on delete restrict,
  resolved_at     timestamptz,
  clinic_id       uuid not null references public.clinics (id),
  constraint dsr_resolution_check check (
    (status in ('recibida', 'en_proceso') and resolved_at is null)
    or (status in ('respondida', 'rechazada') and resolved_at is not null
        and response_note is not null))
);
create index dsr_patient_idx on public.data_subject_requests (patient_id, received_at desc);
create index dsr_open_idx on public.data_subject_requests (clinic_id, received_at)
  where status in ('recibida', 'en_proceso');
create index dsr_received_by_idx on public.data_subject_requests (received_by);
create index dsr_resolved_by_idx on public.data_subject_requests (resolved_by);

create or replace function public.stamp_data_subject_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.received_by   := auth.uid();
    new.received_at   := clock_timestamp();
    new.status        := 'recibida';
    new.response_note := null;
    new.resolved_by   := null;
    new.resolved_at   := null;
    return new;
  end if;

  if old.status in ('respondida', 'rechazada') then
    raise exception 'Una solicitud cerrada no se modifica.';
  end if;
  if (to_jsonb(new) - array['status', 'response_note', 'resolved_by', 'resolved_at'])
     is distinct from (to_jsonb(old) - array['status', 'response_note', 'resolved_by', 'resolved_at']) then
    raise exception 'Solo cambian el estado y la respuesta de una solicitud.';
  end if;
  if new.status in ('respondida', 'rechazada') then
    new.resolved_by := auth.uid();
    new.resolved_at := clock_timestamp();
  else
    new.resolved_by := null;
    new.resolved_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_data_subject_request() from public, anon, authenticated;

-- =====================================================================
-- Triggers comunes, RLS y permisos (B y C)
-- =====================================================================
create trigger a0_set_clinic_id before insert or update on public.patient_guardians
  for each row execute function public.set_clinic_id();
create trigger patient_guardians_stamp before insert or update on public.patient_guardians
  for each row execute function public.stamp_patient_guardian();
create trigger patient_guardians_audit after insert or update or delete on public.patient_guardians
  for each row execute function public.audit_row();

create trigger a0_set_clinic_id before insert or update on public.data_subject_requests
  for each row execute function public.set_clinic_id();
create trigger data_subject_requests_stamp before insert or update on public.data_subject_requests
  for each row execute function public.stamp_data_subject_request();
create trigger data_subject_requests_audit after insert or update or delete on public.data_subject_requests
  for each row execute function public.audit_row();

do $$
declare
  v_table text;
begin
  foreach v_table in array array['patient_guardians', 'data_subject_requests'] loop
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

-- Responsables: leen roles clínicos y recepción; registran y desactivan admin y recepción.
create policy "patient_guardians: ver" on public.patient_guardians for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_guardians.patient_id)
  );
create policy "patient_guardians: registrar" on public.patient_guardians for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    and exists (select 1 from public.patients p where p.id = patient_guardians.patient_id)
  );
create policy "patient_guardians: desactivar" on public.patient_guardians for update to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'))
  with check ((select public.get_my_role()) in ('admin', 'recepcion'));

-- Derechos del titular: recepción registra; solo admin responde y ve todas.
create policy "dsr: ver" on public.data_subject_requests for select to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'));
create policy "dsr: registrar" on public.data_subject_requests for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    and exists (select 1 from public.patients p where p.id = data_subject_requests.patient_id)
  );
create policy "dsr: responder" on public.data_subject_requests for update to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

grant select, insert, update on public.patient_guardians to authenticated;
grant select, insert, update on public.data_subject_requests to authenticated;
