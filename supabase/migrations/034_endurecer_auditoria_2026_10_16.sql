-- 034 · Endurecimiento tras la auditoría del esquema (2026-10-16).
-- Aplicar DESPUÉS de la 033. Sin tablas nuevas; no borra ni modifica datos.
--
-- F3  is_platform_admin() exige aal2 en el JWT (antes un admin de plataforma sin
--     factor y sin rol admin/doctor pasaba con aal1 vía mfa_satisfied()).
-- F7  patients.created_by/created_at y appointments.created_at los fija la base.
-- F1  TRUNCATE bloqueado en tablas clínicas, perfiles, clínicas y audit_log
--     (TRUNCATE no dispara audit_row y service_role lo tiene por defecto).
-- F8  Borrar un paciente ya no borra en cascada sus citas ni sus turnos, y borrar
--     un usuario de Auth ya no borra su perfil: ON DELETE RESTRICT.
-- F6  El doctor solo ve cobros y pagos de sus pacientes, y solo cambia el estado
--     de ítems del plan de sus pacientes (antes: toda la clínica).
-- F2  Sin MAINTAIN (VACUUM, LOCK, REINDEX…) para anon ni authenticated.
-- F12 Funciones de trigger sin EXECUTE para PUBLIC/anon.

-- ---------- F3 ----------
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     and public.mfa_satisfied();
$$;

-- ---------- F7 ----------
create or replace function public.stamp_created()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_has_by boolean := to_jsonb(new) ? 'created_by';
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    if v_has_by then
      new := jsonb_populate_record(new, jsonb_build_object('created_by', auth.uid()));
    end if;
  else
    new.created_at := old.created_at;
    if v_has_by then
      new := jsonb_populate_record(new, jsonb_build_object('created_by', to_jsonb(old) -> 'created_by'));
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_created() from public, anon, authenticated;

create trigger a2_patients_stamp_created
  before insert or update on public.patients
  for each row execute function public.stamp_created();
create trigger a2_appointments_stamp_created
  before insert or update on public.appointments
  for each row execute function public.stamp_created();

-- ---------- F1 ----------
create or replace function public.block_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'TRUNCATE no está permitido en %: los registros no se borran.', tg_table_name;
end;
$$;
revoke all on function public.block_truncate() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'patients', 'appointments', 'queue', 'patient_medical_history', 'clinical_entries',
    'odontogram_entries', 'treatment_plan_items', 'billing_charges', 'billing_payments',
    'doctor_schedules', 'doctor_time_off', 'vital_signs', 'prescriptions',
    'prescription_items', 'profiles', 'clinics', 'audit_log'
  ] loop
    execute format(
      'create trigger block_truncate before truncate on public.%I for each statement execute function public.block_truncate()',
      v_table);
  end loop;
end;
$$;

-- ---------- F8 ----------
alter table public.appointments drop constraint appointments_patient_id_fkey,
  add constraint appointments_patient_id_fkey foreign key (patient_id)
    references public.patients (id) on delete restrict;
alter table public.queue drop constraint queue_patient_id_fkey,
  add constraint queue_patient_id_fkey foreign key (patient_id)
    references public.patients (id) on delete restrict;
alter table public.profiles drop constraint profiles_id_fkey,
  add constraint profiles_id_fkey foreign key (id)
    references auth.users (id) on delete restrict;

-- ---------- F6 ----------
drop policy "billing_charges: ver" on public.billing_charges;
create policy "billing_charges: ver"
  on public.billing_charges for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor'
        and exists (select 1 from public.patients p where p.id = billing_charges.patient_id))
  );

drop policy "billing_payments: ver" on public.billing_payments;
create policy "billing_payments: ver"
  on public.billing_payments for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor'
        and exists (select 1 from public.patients p where p.id = billing_payments.patient_id))
  );

drop policy "treatment_plan_items: doctor cambia estado" on public.treatment_plan_items;
create policy "treatment_plan_items: doctor cambia estado"
  on public.treatment_plan_items for update to authenticated
  using (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = treatment_plan_items.patient_id)
  )
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = treatment_plan_items.patient_id)
  );

-- ---------- F2 ----------
revoke maintain on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated;

-- ---------- F12 ----------
-- Los triggers no necesitan EXECUTE para dispararse. appointment_range se usa en
-- la restricción de no solapamiento (028): se mantiene para authenticated.
revoke execute on function public.enforce_doctor_appointment_update() from public, anon;
revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.appointment_range(timestamptz, integer) from public, anon;
grant execute on function public.appointment_range(timestamptz, integer) to authenticated;
