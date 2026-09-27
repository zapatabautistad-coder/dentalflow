-- =============================================================
-- DentalFlow · Migración 010 · Nada clínico se borra + archivar + Enfermería
-- Requiere la 008 y la 009.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Sin borrado de pacientes ni citas (a nivel de permisos, no de UI).
--    Una cita se cancela con su estado; un paciente se archiva.
-- -------------------------------------------------------------
revoke delete on public.patients, public.appointments from authenticated;

-- -------------------------------------------------------------
-- 2. Archivar pacientes
-- -------------------------------------------------------------
alter table public.patients
  add column archived_at     timestamptz,
  add column archived_by     uuid references public.profiles (id) on delete set null,
  add column archived_reason text;

alter table public.patients
  add constraint patients_archive_consistency check (
    (archived_at is null and archived_reason is null)
    or (archived_at is not null and archived_reason is not null and length(trim(archived_reason)) > 0)
  );

-- Fecha y autor del archivado los pone la base de datos. Solo admin
-- puede restaurar un paciente archivado.
create or replace function public.stamp_patient_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is distinct from old.archived_at then
    if new.archived_at is not null then
      new.archived_at = now();
      new.archived_by = auth.uid();
    else
      if (select public.get_my_role()) is distinct from 'admin' then
        raise exception 'Solo un administrador puede restaurar un paciente archivado.';
      end if;
      new.archived_by = null;
      new.archived_reason = null;
    end if;
  else
    new.archived_by = old.archived_by;
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_patient_archive() from public, anon, authenticated;

create trigger patients_archive_stamp
  before update on public.patients
  for each row execute function public.stamp_patient_archive();

-- -------------------------------------------------------------
-- 3. Enfermería: ve pacientes, citas y turnos (no los edita).
--    El historial médico lo edita por la política de la 009.
-- -------------------------------------------------------------
create policy "patients: enfermeria ve pacientes"
  on public.patients for select to authenticated
  using ((select public.get_my_role()) = 'enfermeria');

create policy "appointments: enfermeria ve citas"
  on public.appointments for select to authenticated
  using ((select public.get_my_role()) = 'enfermeria');

create policy "queue: enfermeria ve turnos"
  on public.queue for select to authenticated
  using ((select public.get_my_role()) = 'enfermeria');
