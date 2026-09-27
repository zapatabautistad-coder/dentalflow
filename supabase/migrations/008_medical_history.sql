-- =============================================================
-- DentalFlow · Migración 008 · Historial médico y alertas del paciente
-- Una fila por paciente. Si no existe fila, el historial NO se ha
-- registrado (distinto de "sin alertas", que es una fila guardada
-- con todo en falso).
-- =============================================================

create table public.patient_medical_history (
  patient_id             uuid primary key references public.patients (id) on delete cascade,

  allergy_penicillin     boolean not null default false,
  allergy_local_anesthetic boolean not null default false,
  allergy_latex          boolean not null default false,
  allergy_nsaids         boolean not null default false,
  allergies_other        text,

  takes_anticoagulants   boolean not null default false,
  takes_bisphosphonates  boolean not null default false,
  current_medications    text,

  has_diabetes           boolean not null default false,
  has_hypertension       boolean not null default false,
  has_heart_disease      boolean not null default false,
  is_pregnant            boolean not null default false,
  conditions_other       text,

  updated_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Quién hizo el último cambio lo decide la base de datos, no la app.
create or replace function public.stamp_medical_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.stamp_medical_history() from public, anon, authenticated;

create trigger patient_medical_history_stamp
  before insert or update on public.patient_medical_history
  for each row execute function public.stamp_medical_history();

alter table public.patient_medical_history enable row level security;

-- Admin, recepción y doctor pueden ver y editar el historial de los
-- pacientes que ya pueden ver. La subconsulta respeta la RLS de
-- patients: un doctor solo alcanza a sus propios pacientes.
create policy "medical_history: ver pacientes visibles"
  on public.patient_medical_history for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "medical_history: registrar"
  on public.patient_medical_history for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "medical_history: actualizar"
  on public.patient_medical_history for update to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor')
    and exists (select 1 from public.patients p where p.id = patient_id)
  )
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Sin política de DELETE: el historial médico no se borra desde la app.
grant select, insert, update on public.patient_medical_history to authenticated;
