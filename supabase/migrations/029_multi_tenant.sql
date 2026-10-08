-- =============================================================
-- DentalFlow · Migración 029 · Multi-tenant (varias clínicas en una base)
--
-- Hasta aquí: una base = una clínica. Desde aquí cada fila clínica y
-- financiera pertenece a una clínica (clinic_id) y nadie ve ni escribe
-- datos de otra clínica.
--
-- Cómo se aísla:
--  * Política RLS RESTRICTIVE por tabla (clinic_id = get_my_clinic()). Se
--    suma con AND a las políticas por rol que ya existen, así que ninguna
--    política permisiva presente o futura puede abrir datos entre clínicas.
--  * clinic_id lo pone la base (trigger set_clinic_id, antes que cualquier
--    otro trigger): el de la clínica del paciente o, si no hay paciente,
--    la del usuario. La app nunca lo manda. No se puede cambiar después.
--  * Consecutivos por clínica: expediente (record_number) y recibo
--    (receipt_number) salen de clinic_counters, sin huecos ni choques.
--  * Un doctor solo se puede usar en citas, turnos y recetas de su clínica.
--
-- Sin DELETE en ninguna tabla nueva; clinics lleva auditoría (audit_row).
-- Los datos existentes pasan a la clínica inicial. Agregar la columna con
-- DEFAULT no dispara triggers, así que el relleno no ensucia audit_log.
-- =============================================================

-- ---------- 1. Clínicas ----------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text,
  phone text,
  tax_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clínica inicial: todos los datos actuales pasan a ella.
insert into public.clinics (name) values ('Bright Smile Dental');

-- Contadores por clínica (expediente y recibo). Sin grants: solo los toca
-- next_clinic_number desde triggers de la base.
create table public.clinic_counters (
  clinic_id uuid not null references public.clinics (id),
  name text not null check (name in ('record', 'receipt')),
  value bigint not null default 0,
  primary key (clinic_id, name)
);

-- ---------- 2. clinic_id en todas las tablas ----------
do $$
declare
  v_clinic uuid := (select id from public.clinics order by created_at limit 1);
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'patients', 'appointments', 'queue', 'clinical_entries',
    'odontogram_entries', 'vital_signs', 'patient_medical_history',
    'treatment_plan_items', 'billing_charges', 'billing_payments',
    'prescriptions', 'prescription_items', 'doctor_schedules',
    'doctor_time_off', 'audit_log'
  ] loop
    execute format(
      'alter table public.%I add column clinic_id uuid not null default %L references public.clinics (id)',
      v_table, v_clinic
    );
    execute format('alter table public.%I alter column clinic_id drop default', v_table);
    execute format('create index %I on public.%I (clinic_id)', v_table || '_clinic_id_idx', v_table);
  end loop;

  -- Los consecutivos siguen donde iban.
  insert into public.clinic_counters (clinic_id, name, value)
  values
    (v_clinic, 'record',  coalesce((select max(record_number) from public.patients), 0)),
    (v_clinic, 'receipt', coalesce((select max(receipt_number) from public.billing_payments), 0));
end $$;

-- ---------- 3. Quién soy y en qué clínica ----------
create or replace function public.get_my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role
    from public.profiles p
    join public.clinics c on c.id = p.clinic_id and c.active
   where p.id = auth.uid() and p.active;
$$;

create function public.get_my_clinic()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.clinic_id
    from public.profiles p
    join public.clinics c on c.id = p.clinic_id and c.active
   where p.id = auth.uid() and p.active;
$$;
revoke all on function public.get_my_clinic() from public, anon;
grant execute on function public.get_my_clinic() to authenticated;

-- ---------- 4. Consecutivos por clínica ----------
create function public.next_clinic_number(p_clinic uuid, p_name text)
returns bigint
language sql security definer set search_path = ''
as $$
  insert into public.clinic_counters (clinic_id, name, value)
  values (p_clinic, p_name, 1)
  on conflict (clinic_id, name)
  do update set value = public.clinic_counters.value + 1
  returning value;
$$;
revoke all on function public.next_clinic_number(uuid, text) from public, anon, authenticated;

create function public.assign_record_number()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.record_number = public.next_clinic_number(new.clinic_id, 'record');
  return new;
end;
$$;
revoke all on function public.assign_record_number() from public, anon, authenticated;

create function public.assign_receipt_number()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.receipt_number = public.next_clinic_number(new.clinic_id, 'receipt');
  return new;
end;
$$;
revoke all on function public.assign_receipt_number() from public, anon, authenticated;

-- El expediente deja de ser identity global.
alter table public.patients alter column record_number drop identity;

-- El recibo ya no sale de la secuencia global.
create or replace function public.stamp_billing_payment()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- receipt_number lo pone assign_receipt_number (consecutivo por clínica).
    new.received_by = auth.uid();
    new.received_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.receipt_number is distinct from old.receipt_number
     or new.amount is distinct from old.amount
     or new.method is distinct from old.method
     or new.reference is distinct from old.reference
     or new.note is distinct from old.note then
    raise exception 'Un pago registrado no se edita: anúlalo y registra uno nuevo.';
  end if;
  new.received_by = old.received_by;
  new.received_at = old.received_at;

  if old.voided_at is not null then
    raise exception 'Este pago ya está anulado.';
  end if;
  if new.voided_at is null then
    raise exception 'Un pago solo se puede anular.';
  end if;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;

drop sequence public.billing_receipt_seq;

-- Únicos por clínica (dos clínicas pueden repetir cédula, expediente y recibo).
alter table public.patients
  drop constraint patients_document_id_key,
  drop constraint patients_record_number_key,
  add constraint patients_clinic_document_id_key unique (clinic_id, document_id),
  add constraint patients_clinic_record_number_key unique (clinic_id, record_number);

alter table public.billing_payments
  drop constraint billing_payments_receipt_number_key,
  add constraint billing_payments_clinic_receipt_number_key unique (clinic_id, receipt_number);

alter table public.queue
  drop constraint queue_queue_date_position_key,
  add constraint queue_clinic_date_position_key unique (clinic_id, queue_date, position);

-- ---------- 5. clinic_id lo pone la base ----------
create function public.set_clinic_id()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_clinic uuid;
  v_doctor uuid;
begin
  if tg_op = 'UPDATE' then
    if new.clinic_id is distinct from old.clinic_id then
      raise exception 'La clínica de un registro no se puede cambiar.';
    end if;
    return new;
  end if;

  if tg_table_name = 'prescription_items' then
    select r.clinic_id into v_clinic
      from public.prescriptions r where r.id = (v_row ->> 'prescription_id')::uuid;
  elsif tg_table_name = 'profiles' then
    -- handle_new_user manda la clínica; si no, la del admin que crea el perfil.
    v_clinic := coalesce(new.clinic_id, public.get_my_clinic());
  elsif v_row ? 'patient_id' then
    select p.clinic_id into v_clinic
      from public.patients p where p.id = (v_row ->> 'patient_id')::uuid;
  else
    v_clinic := public.get_my_clinic();
  end if;

  if v_clinic is null then
    raise exception 'No se pudo determinar la clínica del registro.';
  end if;

  v_doctor := nullif(v_row ->> 'doctor_id', '')::uuid;
  if v_doctor is not null and not exists (
    select 1 from public.profiles d where d.id = v_doctor and d.clinic_id = v_clinic
  ) then
    raise exception 'El doctor no pertenece a esta clínica.';
  end if;

  new.clinic_id = v_clinic;
  return new;
end;
$$;
revoke all on function public.set_clinic_id() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'patients', 'appointments', 'queue', 'clinical_entries',
    'odontogram_entries', 'vital_signs', 'patient_medical_history',
    'treatment_plan_items', 'billing_charges', 'billing_payments',
    'prescriptions', 'prescription_items', 'doctor_schedules', 'doctor_time_off'
  ] loop
    -- "a0_" para que corra antes que cualquier otro trigger BEFORE.
    execute format(
      'create trigger a0_set_clinic_id before insert or update on public.%I
         for each row execute function public.set_clinic_id()', v_table);
  end loop;
end $$;

create trigger a1_patients_record_number before insert on public.patients
  for each row execute function public.assign_record_number();
create trigger a1_billing_payments_receipt before insert on public.billing_payments
  for each row execute function public.assign_receipt_number();

-- ---------- 6. Funciones que ya existían ----------
-- Perfil nuevo: la clínica viene en app_metadata (solo la puede escribir el
-- servidor con la clave service_role; el usuario no puede cambiarla).
-- Transición: si no viene y existe una sola clínica activa, se usa esa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_clinic uuid := nullif(new.raw_app_meta_data ->> 'clinic_id', '')::uuid;
begin
  if v_clinic is null then
    select case when count(*) = 1 then min(c.id::text)::uuid end
      into v_clinic from public.clinics c where c.active;
  end if;
  if v_clinic is null then
    raise exception 'El usuario necesita una clínica (app_metadata.clinic_id).';
  end if;

  insert into public.profiles (id, full_name, clinic_id)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_clinic);
  return new;
end;
$$;

-- La bitácora guarda la clínica de la fila auditada.
create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) = to_jsonb(old) then
    return null;
  end if;

  insert into public.audit_log
    (table_name, record_id, patient_id, clinic_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    (case when tg_table_name = 'patient_medical_history' then v_row ->> 'patient_id' else v_row ->> 'id' end)::uuid,
    (case when tg_table_name = 'patients' then v_row ->> 'id' else v_row ->> 'patient_id' end)::uuid,
    (case when tg_table_name = 'clinics' then v_row ->> 'id' else v_row ->> 'clinic_id' end)::uuid,
    tg_op,
    auth.uid(),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );

  return null;
end;
$$;

-- La posición del turno se cuenta por clínica y día.
create or replace function public.assign_queue_position()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.queue_date is null then
    raise exception 'El turno necesita una fecha (queue_date).';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('public.queue.position'),
    hashtext(new.clinic_id::text || new.queue_date::text)
  );

  select coalesce(max(q.position), 0) + 1
    into new.position
    from public.queue q
   where q.clinic_id = new.clinic_id
     and q.queue_date = new.queue_date;

  return new;
end;
$$;

-- Siempre debe quedar al menos un admin activo en CADA clínica.
create or replace function public.stamp_profile()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el identificador del usuario.';
  end if;
  new.created_at = old.created_at;

  if auth.uid() = old.id
     and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.';
  end if;

  if old.role = 'admin' and old.active
     and (new.role is distinct from 'admin' or not new.active)
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and active and id <> old.id and clinic_id = old.clinic_id
     ) then
    raise exception 'Debe quedar al menos un administrador activo.';
  end if;

  if new.active is distinct from old.active then
    if new.active then
      new.deactivated_at = null;
      new.deactivated_by = null;
      new.deactivated_reason = null;
    else
      new.deactivated_at = now();
      new.deactivated_by = auth.uid();
    end if;
  else
    new.deactivated_at = old.deactivated_at;
    new.deactivated_by = old.deactivated_by;
    new.deactivated_reason = old.deactivated_reason;
  end if;

  return new;
end;
$$;

-- ---------- 7. RLS: aislamiento por clínica ----------
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'patients', 'appointments', 'queue', 'clinical_entries',
    'odontogram_entries', 'vital_signs', 'patient_medical_history',
    'treatment_plan_items', 'billing_charges', 'billing_payments',
    'prescriptions', 'prescription_items', 'doctor_schedules',
    'doctor_time_off', 'audit_log'
  ] loop
    execute format(
      'create policy "aislamiento por clínica" on public.%I as restrictive for all to authenticated
         using (clinic_id = (select public.get_my_clinic()))
         with check (clinic_id = (select public.get_my_clinic()))', v_table);
  end loop;
end $$;

-- Cada usuario ve solo su clínica; el admin edita sus datos de contacto.
-- Crear clínicas nuevas queda para el rol de plataforma (fuera de la app).
alter table public.clinics enable row level security;

create policy "clinics: ver la mía" on public.clinics
  for select to authenticated
  using (id = (select public.get_my_clinic()));

create policy "clinics: admin edita la suya" on public.clinics
  for update to authenticated
  using (id = (select public.get_my_clinic()) and (select public.get_my_role()) = 'admin')
  with check (id = (select public.get_my_clinic()) and (select public.get_my_role()) = 'admin');

grant select on public.clinics to authenticated;
grant update (name, address, phone, tax_id) on public.clinics to authenticated;

create trigger clinics_audit after insert or update or delete on public.clinics
  for each row execute function public.audit_row();

-- clinic_counters: RLS activada por el event trigger y sin políticas ni grants.
alter table public.clinic_counters enable row level security;
