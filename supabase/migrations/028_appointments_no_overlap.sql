-- =============================================================
-- DentalFlow · Migración 028 · Citas sin solapamiento por doctor
-- YA APLICADA EN PRODUCCIÓN el 2026-10-04 (nombre en Supabase:
-- "appointments_no_overlap", entre 024 y 025). Este archivo solo la guarda
-- en el repo para que la base se pueda reconstruir; NO volver a ejecutarla
-- en producción. Contenido idéntico al aplicado.
-- =============================================================

-- Bloqueo de doble reserva: un doctor no puede tener dos citas activas que se solapen.
-- Las citas canceladas o marcadas como "no asistió" liberan el horario.

create extension if not exists btree_gist with schema extensions;

-- Rango [inicio, fin) de una cita. El fin no se incluye: una cita de 9:00 a 9:45
-- puede ir seguida de otra a las 9:45. Sumar solo minutos a un timestamptz no
-- depende de la zona horaria, por eso es seguro marcarla IMMUTABLE (Postgres lo
-- exige para usarla dentro de un constraint).
create or replace function public.appointment_range(p_starts_at timestamptz, p_duration_minutes integer)
returns tstzrange
language sql
immutable
parallel safe
set search_path = ''
as $$
  select pg_catalog.tstzrange(
    p_starts_at,
    p_starts_at + pg_catalog.make_interval(mins => p_duration_minutes),
    '[)'
  )
$$;

-- Garantía dura: la base de datos rechaza el solapamiento aunque dos personas
-- guarden al mismo tiempo (error 23P01).
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    doctor_id with =,
    (public.appointment_range(starts_at, duration_minutes)) with &&
  )
  where (status not in ('cancelada', 'no_asistio'));

-- Mensaje claro para el caso normal, con el mismo formato que los demás guards
-- (P0001 + hint). El constraint de arriba cubre el caso simultáneo.
create or replace function public.enforce_appointment_no_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('cancelada', 'no_asistio') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.starts_at = old.starts_at
     and new.duration_minutes = old.duration_minutes
     and new.doctor_id = old.doctor_id
     and old.status not in ('cancelada', 'no_asistio') then
    return new;
  end if;
  if exists (
    select 1
    from public.appointments a
    where a.doctor_id = new.doctor_id
      and a.id <> new.id
      and a.status not in ('cancelada', 'no_asistio')
      and public.appointment_range(a.starts_at, a.duration_minutes)
          && public.appointment_range(new.starts_at, new.duration_minutes)
  ) then
    raise exception 'El doctor ya tiene una cita en ese horario.'
      using errcode = 'P0001', hint = 'cita_solapada';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_appointment_no_overlap() from public, anon, authenticated;

create trigger appointments_slot_overlap_guard
  before insert or update on public.appointments
  for each row execute function public.enforce_appointment_no_overlap();
