-- =============================================================
-- DentalFlow · Migración 014 · Sala de espera: doctor, horas y auditoría
-- - Horas de llegada, llamado y fin las pone la base de datos.
-- - Solo se permiten los pasos: en_espera → llamado → en_atencion →
--   atendido, y cancelar mientras no esté atendido.
-- - El doctor puede mover los turnos asignados a él (solo el estado).
-- - Sin DELETE y con auditoría (audit_log), como el resto de datos clínicos.
-- =============================================================

create or replace function public.stamp_queue()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status = 'en_espera';
    new.checked_in_at = now();
    new.called_at = null;
    new.finished_at = null;
    return new;
  end if;

  -- El doctor solo cambia el estado de sus propios turnos.
  if (select public.get_my_role()) = 'doctor' then
    if new.id is distinct from old.id
       or new.queue_date is distinct from old.queue_date
       or new.position is distinct from old.position
       or new.patient_id is distinct from old.patient_id
       or new.appointment_id is distinct from old.appointment_id
       or new.doctor_id is distinct from old.doctor_id then
      raise exception 'El doctor solo puede cambiar el estado del turno.';
    end if;
  end if;

  new.checked_in_at = old.checked_in_at;
  new.called_at = old.called_at;
  new.finished_at = old.finished_at;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'en_espera' and new.status = 'llamado')
      or (old.status = 'llamado' and new.status = 'en_atencion')
      or (old.status = 'en_atencion' and new.status = 'atendido')
      or (new.status = 'cancelado' and old.status not in ('atendido', 'cancelado'))
    ) then
      raise exception 'Cambio de estado no permitido: % → %.', old.status, new.status;
    end if;

    if new.status = 'llamado' then
      new.called_at = now();
    elsif new.status in ('atendido', 'cancelado') then
      new.finished_at = now();
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_queue() from public, anon, authenticated;

create trigger queue_stamp
  before insert or update on public.queue
  for each row execute function public.stamp_queue();

create trigger queue_audit
  after insert or update or delete on public.queue
  for each row execute function public.audit_row();

create policy "queue: doctor actualiza sus turnos"
  on public.queue for update to authenticated
  using ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  with check ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()));

revoke delete on public.queue from authenticated;
