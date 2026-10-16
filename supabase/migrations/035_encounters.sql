-- 035 · Consultas (encounters): ancla de una visita clínica completa.
--
-- Una consulta agrupa lo que se registra en una visita: notas clínicas, odontograma,
-- signos vitales y recetas. Se abre (doctor o asistente dental) y la cierra el doctor.
-- Cerrada no se modifica. Sin DELETE. Autor, rol y fechas los pone la base.
-- Enlazar registros es opcional (encounter_id nulo = registro suelto, como hasta hoy);
-- si se enlaza, la consulta debe ser del mismo paciente y estar abierta.

create type public.encounter_status as enum ('abierta', 'cerrada');

create table public.encounters (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients (id) on delete restrict,
  appointment_id  uuid references public.appointments (id) on delete restrict,
  reason          text check (reason is null or length(reason) <= 500),
  status          public.encounter_status not null default 'abierta',
  opened_by       uuid references public.profiles (id) on delete restrict,
  opened_by_role  public.user_role,
  opened_at       timestamptz not null default now(),
  closed_by       uuid references public.profiles (id) on delete restrict,
  closed_at       timestamptz,
  closure_note    text check (closure_note is null or length(closure_note) <= 1000),
  clinic_id       uuid not null references public.clinics (id),
  constraint encounters_closed_consistent check ((status = 'cerrada') = (closed_at is not null))
);

-- Una cita tiene como máximo una consulta.
create unique index encounters_appointment_key on public.encounters (appointment_id)
  where appointment_id is not null;
create index encounters_patient_idx on public.encounters (patient_id, opened_at);
create index encounters_clinic_id_idx on public.encounters (clinic_id);
create index encounters_opened_by_idx on public.encounters (opened_by);
create index encounters_closed_by_idx on public.encounters (closed_by);

-- Autoría y ciclo de vida: abrir fija autor y fecha; lo único posible después es cerrar.
create or replace function public.stamp_encounter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'abierta';
    new.opened_by := auth.uid();
    new.opened_by_role := (select public.get_my_role());
    new.opened_at := now();
    new.closed_by := null;
    new.closed_at := null;
    new.closure_note := null;
    return new;
  end if;

  if old.status = 'cerrada' then
    raise exception 'La consulta ya está cerrada y no se modifica.';
  end if;
  if new.status <> 'cerrada' then
    raise exception 'Una consulta abierta solo se puede cerrar.';
  end if;
  if new.patient_id is distinct from old.patient_id
     or new.appointment_id is distinct from old.appointment_id
     or new.reason is distinct from old.reason
     or new.opened_by is distinct from old.opened_by
     or new.opened_by_role is distinct from old.opened_by_role
     or new.opened_at is distinct from old.opened_at then
    raise exception 'Al cerrar una consulta solo se agrega la nota de cierre.';
  end if;
  new.closed_by := auth.uid();
  new.closed_at := now();
  return new;
end;
$$;
revoke all on function public.stamp_encounter() from public, anon, authenticated;

create trigger a0_set_clinic_id before insert or update on public.encounters
  for each row execute function public.set_clinic_id();
create trigger encounters_stamp before insert or update on public.encounters
  for each row execute function public.stamp_encounter();
create trigger encounters_audit after insert or update or delete on public.encounters
  for each row execute function public.audit_row();
create trigger block_truncate before truncate on public.encounters
  for each statement execute function public.block_truncate();

alter table public.encounters enable row level security;

create policy "aislamiento por clínica" on public.encounters as restrictive to authenticated
  using (clinic_id = (select public.get_my_clinic()))
  with check (clinic_id = (select public.get_my_clinic()));

create policy "encounters: ver" on public.encounters for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = encounters.patient_id)
  );

create policy "encounters: abrir" on public.encounters for insert to authenticated
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = encounters.patient_id)
  );

create policy "encounters: doctor cierra" on public.encounters for update to authenticated
  using (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = encounters.patient_id)
  )
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = encounters.patient_id)
  );

grant select, insert, update on public.encounters to authenticated;

-- ---------- Enlace de registros clínicos a la consulta ----------
create or replace function public.check_encounter_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_patient uuid;
  v_status public.encounter_status;
begin
  if tg_op = 'UPDATE' then
    if new.encounter_id is distinct from old.encounter_id then
      raise exception 'La consulta de un registro no se puede cambiar.';
    end if;
    return new;
  end if;
  if new.encounter_id is null then
    return new;
  end if;
  select e.patient_id, e.status into v_patient, v_status
    from public.encounters e where e.id = new.encounter_id;
  if v_patient is distinct from new.patient_id then
    raise exception 'La consulta no es de este paciente.';
  end if;
  if v_status <> 'abierta' then
    raise exception 'La consulta está cerrada: no admite registros nuevos.';
  end if;
  return new;
end;
$$;
revoke all on function public.check_encounter_link() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['clinical_entries', 'odontogram_entries', 'vital_signs', 'prescriptions'] loop
    execute format(
      'alter table public.%I add column encounter_id uuid references public.encounters (id) on delete restrict',
      v_table);
    execute format('create index %I on public.%I (encounter_id)', v_table || '_encounter_idx', v_table);
    execute format(
      'create trigger b_check_encounter before insert or update on public.%I for each row execute function public.check_encounter_link()',
      v_table);
  end loop;
end;
$$;
