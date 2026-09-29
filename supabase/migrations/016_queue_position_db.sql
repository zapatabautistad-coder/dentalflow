-- =============================================================
-- DentalFlow · Migración 016 · Sala de espera: la base asigna la posición
--
-- Problema: la app calculaba la posición del turno ("último + 1") y
-- reintentaba solo 2 veces si chocaba con UNIQUE (queue_date, position).
-- Con varias llegadas casi simultáneas un paciente podía quedar fuera de
-- la fila.
--
-- Solución: un trigger BEFORE INSERT asigna la posición dentro de la
-- base, bajo un candado (advisory lock) por fecha de la fila:
-- - Cualquier valor de `position` que envíe la app se IGNORA.
-- - Dos registros simultáneos del mismo día se esperan uno al otro
--   (el candado dura hasta el fin de la transacción), así el segundo ve
--   el turno del primero y toma el número siguiente. Días distintos no
--   se bloquean entre sí.
-- - La restricción UNIQUE (queue_date, position) se mantiene como red
--   de seguridad.
--
-- No cambia: stamp_queue (estado y horas), RLS, GRANT, auditoría
-- (queue_audit registra la fila ya con su posición) ni la ausencia de
-- DELETE. Los UPDATE no pasan por este trigger.
--
-- Segura de re-ejecutar: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- =============================================================

create or replace function public.assign_queue_position()
returns trigger
language plpgsql
-- SECURITY DEFINER: el máximo se calcula sobre TODA la fila del día,
-- aunque la RLS de quien inserta no le deje ver todos los turnos.
-- Solo se ejecuta como trigger (no se expone por RPC: ver REVOKE abajo).
security definer
set search_path = ''
as $$
begin
  if new.queue_date is null then
    raise exception 'El turno necesita una fecha (queue_date).';
  end if;

  -- Candado por fecha: clave 1 fija para "posición de la fila",
  -- clave 2 = días desde 2000-01-01 (cabe en integer).
  perform pg_advisory_xact_lock(
    hashtext('public.queue.position'),
    new.queue_date - date '2000-01-01'
  );

  -- Ya con el candado, esta consulta toma una foto nueva (READ COMMITTED)
  -- y ve los turnos confirmados por quien tenía el candado antes.
  -- Cuenta todos los estados (también cancelados) porque la UNIQUE los
  -- incluye.
  select coalesce(max(q.position), 0) + 1
    into new.position
    from public.queue q
   where q.queue_date = new.queue_date;

  return new;
end;
$$;

-- Nadie la llama directo; los triggers no necesitan permiso EXECUTE.
revoke execute on function public.assign_queue_position() from public, anon, authenticated;

drop trigger if exists queue_assign_position on public.queue;

create trigger queue_assign_position
  before insert on public.queue
  for each row execute function public.assign_queue_position();
