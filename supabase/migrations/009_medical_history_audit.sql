-- =============================================================
-- DentalFlow · Migración 009 · Historial médico + registro de auditoría
-- Requiere la 008 (rol enfermeria).
--
-- patient_medical_history: una fila por paciente. Sin fila = historial
-- NO registrado (distinto de "sin alertas": fila guardada en falso).
--
-- audit_log: cada INSERT/UPDATE/DELETE en patients, appointments y
-- patient_medical_history deja una fila con la versión anterior, la
-- nueva, quién y cuándo. Los usuarios solo pueden leerla.
-- =============================================================

-- -------------------------------------------------------------
-- Historial médico
-- -------------------------------------------------------------
create table public.patient_medical_history (
  patient_id               uuid primary key references public.patients (id) on delete restrict,

  allergy_penicillin       boolean not null default false,
  allergy_local_anesthetic boolean not null default false,
  allergy_latex            boolean not null default false,
  allergy_nsaids           boolean not null default false,
  allergies_other          text,

  takes_anticoagulants     boolean not null default false,
  takes_bisphosphonates    boolean not null default false,
  current_medications      text,

  has_diabetes             boolean not null default false,
  has_hypertension         boolean not null default false,
  has_heart_disease        boolean not null default false,
  is_pregnant              boolean not null default false,
  conditions_other         text,

  updated_by               uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Quién hizo el último cambio y cuándo lo decide la base de datos.
create or replace function public.stamp_medical_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = auth.uid();
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_medical_history() from public, anon, authenticated;

create trigger patient_medical_history_stamp
  before insert or update on public.patient_medical_history
  for each row execute function public.stamp_medical_history();

alter table public.patient_medical_history enable row level security;

-- Cualquier rol clínico ve y edita el historial de los pacientes que ya
-- puede ver (la subconsulta respeta la RLS de patients).
create policy "medical_history: ver"
  on public.patient_medical_history for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "medical_history: registrar"
  on public.patient_medical_history for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "medical_history: actualizar"
  on public.patient_medical_history for update to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  )
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Sin política ni permiso de DELETE: el historial médico no se borra.
grant select, insert, update on public.patient_medical_history to authenticated;

-- -------------------------------------------------------------
-- Registro de auditoría
-- -------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid not null,
  patient_id  uuid,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  uuid references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now(),
  old_data    jsonb,
  new_data    jsonb
);

create index audit_log_patient_idx on public.audit_log (patient_id, changed_at desc);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) = to_jsonb(old) then
    return null;
  end if;

  insert into public.audit_log (table_name, record_id, patient_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    (case when tg_table_name = 'patient_medical_history' then v_row ->> 'patient_id' else v_row ->> 'id' end)::uuid,
    (case when tg_table_name = 'patients' then v_row ->> 'id' else v_row ->> 'patient_id' end)::uuid,
    tg_op,
    auth.uid(),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );

  return null;
end;
$$;

revoke execute on function public.audit_row() from public, anon, authenticated;

create trigger patients_audit
  after insert or update or delete on public.patients
  for each row execute function public.audit_row();

create trigger appointments_audit
  after insert or update or delete on public.appointments
  for each row execute function public.audit_row();

create trigger patient_medical_history_audit
  after insert or update or delete on public.patient_medical_history
  for each row execute function public.audit_row();

alter table public.audit_log enable row level security;

-- Admin ve todo; los demás, el historial de los pacientes que pueden ver.
create policy "audit_log: ver"
  on public.audit_log for select to authenticated
  using (
    (select public.get_my_role()) = 'admin'
    or exists (select 1 from public.patients p where p.id = audit_log.patient_id)
  );

-- Solo lectura: nadie inserta, cambia ni borra filas desde la app.
grant select on public.audit_log to authenticated;
