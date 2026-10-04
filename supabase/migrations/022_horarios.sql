-- =============================================================
-- DentalFlow · Migración 022 · Horarios de doctores
-- doctor_schedules: bloques semanales de trabajo (día + hora inicio/fin,
--   hora local de Santo Domingo). Varios bloques por día (mañana/tarde).
--   No se borran ni se editan: un bloque se desactiva y se crea otro.
-- doctor_time_off: días libres (rango de fechas, con motivo). No se borran:
--   se anulan con motivo.
-- Regla en la base: si el doctor tiene al menos un bloque activo, una cita
-- nueva o movida debe caer completa dentro de un bloque y no en un día libre.
-- Sin bloques configurados no se restringe nada (no rompe citas actuales).
-- Gestionan admin y recepción; el doctor gestiona los suyos; todos leen.
-- Quién y cuándo lo pone la base. Auditado, sin DELETE.
-- =============================================================

create table public.doctor_schedules (
  id                uuid primary key default gen_random_uuid(),
  doctor_id         uuid not null references public.profiles (id) on delete restrict,
  weekday           smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time        time not null,
  end_time          time not null,
  active            boolean not null default true,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  deactivated_by    uuid references public.profiles (id) on delete set null,
  deactivated_at    timestamptz,
  constraint doctor_schedules_range check (end_time > start_time)
);

create index doctor_schedules_doctor_idx on public.doctor_schedules (doctor_id, weekday) where active;

create table public.doctor_time_off (
  id                uuid primary key default gen_random_uuid(),
  doctor_id         uuid not null references public.profiles (id) on delete restrict,
  starts_on         date not null,
  ends_on           date not null,
  reason            text not null check (length(trim(reason)) between 3 and 200),
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  voided_at         timestamptz,
  voided_by         uuid references public.profiles (id) on delete set null,
  void_reason       text check (void_reason is null or length(trim(void_reason)) between 5 and 500),
  constraint doctor_time_off_range check (ends_on >= starts_on),
  constraint doctor_time_off_void check ((voided_at is null) = (void_reason is null))
);

create index doctor_time_off_doctor_idx on public.doctor_time_off (doctor_id, starts_on) where voided_at is null;

-- ---------- Sellos: autor/fecha y qué se puede cambiar ----------

create or replace function public.stamp_doctor_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.profiles where id = new.doctor_id and role = 'doctor' and active) then
      raise exception 'El horario debe ser de un doctor activo.';
    end if;
    if exists (
      select 1 from public.doctor_schedules s
      where s.doctor_id = new.doctor_id and s.weekday = new.weekday and s.active
        and s.start_time < new.end_time and new.start_time < s.end_time
    ) then
      raise exception 'Ese bloque se cruza con otro horario del mismo día.';
    end if;
    new.active = true;
    new.created_by = auth.uid();
    new.created_at = now();
    new.deactivated_by = null;
    new.deactivated_at = null;
    return new;
  end if;

  -- Solo se permite desactivar.
  if new.doctor_id is distinct from old.doctor_id
     or new.weekday is distinct from old.weekday
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
     or not (old.active and not new.active) then
    raise exception 'Un horario no se edita: desactívalo y crea otro.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.deactivated_by = auth.uid();
  new.deactivated_at = now();
  return new;
end;
$$;

create or replace function public.stamp_doctor_time_off()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.profiles where id = new.doctor_id and role = 'doctor' and active) then
      raise exception 'El día libre debe ser de un doctor activo.';
    end if;
    new.created_by = auth.uid();
    new.created_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;

  -- Solo se permite anular (con motivo).
  if new.doctor_id is distinct from old.doctor_id
     or new.starts_on is distinct from old.starts_on
     or new.ends_on is distinct from old.ends_on
     or new.reason is distinct from old.reason
     or old.voided_at is not null
     or new.void_reason is null then
    raise exception 'Un día libre no se edita: anúlalo con motivo y crea otro.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;

revoke execute on function public.stamp_doctor_schedule() from public, anon, authenticated;
revoke execute on function public.stamp_doctor_time_off() from public, anon, authenticated;

create trigger doctor_schedules_stamp
  before insert or update on public.doctor_schedules
  for each row execute function public.stamp_doctor_schedule();
create trigger doctor_schedules_audit
  after insert or update or delete on public.doctor_schedules
  for each row execute function public.audit_row();

create trigger doctor_time_off_stamp
  before insert or update on public.doctor_time_off
  for each row execute function public.stamp_doctor_time_off();
create trigger doctor_time_off_audit
  after insert or update or delete on public.doctor_time_off
  for each row execute function public.audit_row();

-- ---------- Regla: citas dentro del horario ----------

create or replace function public.enforce_appointment_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamp := new.starts_at at time zone 'America/Santo_Domingo';
  v_end   timestamp := v_start + make_interval(mins => new.duration_minutes);
begin
  if new.status = 'cancelada' then
    return new;
  end if;

  -- En UPDATE solo se revisa si cambió el momento, el doctor o si se reactiva.
  if tg_op = 'UPDATE'
     and new.starts_at = old.starts_at
     and new.duration_minutes = old.duration_minutes
     and new.doctor_id = old.doctor_id
     and old.status <> 'cancelada' then
    return new;
  end if;

  -- Sin horario configurado no se restringe.
  if not exists (select 1 from public.doctor_schedules where doctor_id = new.doctor_id and active) then
    return new;
  end if;

  if exists (
    select 1 from public.doctor_time_off t
    where t.doctor_id = new.doctor_id and t.voided_at is null
      and v_start::date between t.starts_on and t.ends_on
  ) then
    raise exception 'El doctor tiene ese día libre.' using errcode = 'P0001', hint = 'fuera_de_horario';
  end if;

  if not exists (
    select 1 from public.doctor_schedules s
    where s.doctor_id = new.doctor_id and s.active
      and s.weekday = extract(dow from v_start)
      and s.start_time <= v_start::time
      and s.end_time >= v_end::time
      and v_end::date = v_start::date
  ) then
    raise exception 'La cita queda fuera del horario del doctor.' using errcode = 'P0001', hint = 'fuera_de_horario';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_appointment_schedule() from public, anon, authenticated;

create trigger appointments_schedule_guard
  before insert or update on public.appointments
  for each row execute function public.enforce_appointment_schedule();

-- ---------- Permisos ----------

alter table public.doctor_schedules enable row level security;
alter table public.doctor_time_off enable row level security;

create policy "doctor_schedules: ver" on public.doctor_schedules for select to authenticated
  using ((select public.get_my_role()) is not null);
create policy "doctor_schedules: registrar" on public.doctor_schedules for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  );
create policy "doctor_schedules: desactivar" on public.doctor_schedules for update to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  )
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  );

create policy "doctor_time_off: ver" on public.doctor_time_off for select to authenticated
  using ((select public.get_my_role()) is not null);
create policy "doctor_time_off: registrar" on public.doctor_time_off for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  );
create policy "doctor_time_off: anular" on public.doctor_time_off for update to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  )
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    or ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  );

-- Sin DELETE: un horario se desactiva y un día libre se anula.
grant select, insert, update on public.doctor_schedules to authenticated;
grant select, insert, update on public.doctor_time_off to authenticated;
