-- =============================================================
-- DentalFlow · Migración 003 · Doctor cambia el estado de sus citas
-- Pegar completo en el SQL Editor de Supabase.
-- =============================================================

-- La 001 solo le da al doctor permiso de SELECT sobre sus citas.
-- Esta política agrega UPDATE, limitado a sus propias citas.
create policy "appointments: doctor actualiza sus citas"
  on public.appointments for update to authenticated
  using (
    (select public.get_my_role()) = 'doctor'
    and doctor_id = (select auth.uid())
  )
  with check (
    (select public.get_my_role()) = 'doctor'
    and doctor_id = (select auth.uid())
  );

-- La política de arriba solo controla qué filas puede tocar el doctor,
-- no qué columnas. Este trigger refuerza que, siendo doctor, un UPDATE
-- solo puede cambiar "status" (nunca a 'cancelada', reservado para
-- admin/recepción); el resto de columnas debe quedar igual.
create or replace function public.enforce_doctor_appointment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select public.get_my_role()) = 'doctor' then
    if new.patient_id is distinct from old.patient_id
       or new.doctor_id is distinct from old.doctor_id
       or new.starts_at is distinct from old.starts_at
       or new.duration_minutes is distinct from old.duration_minutes
       or new.reason is distinct from old.reason then
      raise exception 'El doctor solo puede cambiar el estado de la cita.';
    end if;

    if new.status = 'cancelada' then
      raise exception 'Solo admin o recepción pueden cancelar citas.';
    end if;
  end if;

  return new;
end;
$$;

create trigger appointments_doctor_update_guard
  before update on public.appointments
  for each row execute function public.enforce_doctor_appointment_update();
