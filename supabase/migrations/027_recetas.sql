-- =============================================================
-- DentalFlow · Migración 027 · Recetas con exequátur
-- profiles.exequatur: número de exequátur del doctor (lo asigna el admin).
-- prescriptions + prescription_items: receta para la farmacia. Solo el doctor
-- receta; todos los roles leen. Nombre y exequátur del doctor se copian en la
-- receta al crearla (lo impreso no cambia si luego cambia el perfil). Sin
-- exequátur no se puede recetar. Receta y medicamentos se crean juntos con
-- create_prescription() (una sola transacción): no se agregan medicamentos
-- después. Nada se edita ni se borra: la receta se anula con motivo, solo por
-- el doctor que la hizo. Autor y fecha por la base. Auditado.
-- =============================================================

alter table public.profiles
  add column exequatur text check (exequatur is null or exequatur ~ '^[0-9A-Za-z./-]{1,30}$');

create table public.prescriptions (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients (id) on delete restrict,
  appointment_id      uuid references public.appointments (id) on delete restrict,
  indications         text check (indications is null or length(indications) <= 1000),

  doctor_id           uuid references public.profiles (id) on delete set null,
  doctor_name         text not null default '',
  doctor_exequatur    text not null default '',
  created_at          timestamptz not null default now(),

  voided_at           timestamptz,
  voided_by           uuid references public.profiles (id) on delete set null,
  void_reason         text check (void_reason is null or length(trim(void_reason)) between 5 and 500),
  constraint prescriptions_void check ((voided_at is null) = (void_reason is null))
);

create index prescriptions_patient_idx on public.prescriptions (patient_id, created_at);
create index prescriptions_appointment_idx on public.prescriptions (appointment_id);
create index prescriptions_doctor_idx on public.prescriptions (doctor_id);
create index prescriptions_voided_by_idx on public.prescriptions (voided_by);

create table public.prescription_items (
  id                  uuid primary key default gen_random_uuid(),
  prescription_id     uuid not null references public.prescriptions (id) on delete restrict,
  patient_id          uuid references public.patients (id) on delete restrict,
  position            smallint not null check (position between 1 and 20),
  medication          text not null check (length(trim(medication)) between 2 and 200),
  dose                text check (dose is null or length(dose) <= 100),
  frequency           text check (frequency is null or length(frequency) <= 100),
  duration            text check (duration is null or length(duration) <= 100),
  quantity            text check (quantity is null or length(quantity) <= 50),
  instructions        text check (instructions is null or length(instructions) <= 300),
  unique (prescription_id, position)
);

create index prescription_items_patient_idx on public.prescription_items (patient_id);

-- ---------- Sellos ----------

create or replace function public.stamp_prescription()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_name text;
  v_exequatur text;
  v_patient uuid;
begin
  if tg_op = 'INSERT' then
    select full_name, exequatur into v_name, v_exequatur
      from public.profiles where id = auth.uid() and role = 'doctor' and active;
    if v_name is null then
      raise exception 'Solo un doctor activo puede recetar.';
    end if;
    if coalesce(trim(v_exequatur), '') = '' then
      raise exception 'Falta el exequátur del doctor. Pídele al administrador que lo registre en Cuentas.';
    end if;
    if new.appointment_id is not null then
      select patient_id into v_patient from public.appointments where id = new.appointment_id;
      if v_patient is distinct from new.patient_id then
        raise exception 'La cita no es de este paciente.';
      end if;
    end if;
    new.doctor_id = auth.uid();
    new.doctor_name = v_name;
    new.doctor_exequatur = v_exequatur;
    new.created_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;

  -- Solo se permite anular (una vez, con motivo).
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.appointment_id is distinct from old.appointment_id
     or new.indications is distinct from old.indications
     or new.doctor_id is distinct from old.doctor_id
     or new.doctor_name is distinct from old.doctor_name
     or new.doctor_exequatur is distinct from old.doctor_exequatur
     or new.created_at is distinct from old.created_at
     or old.voided_at is not null
     or new.void_reason is null then
    raise exception 'Una receta no se edita: anúlala con motivo y haz otra.';
  end if;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;

create or replace function public.stamp_prescription_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_patient uuid;
  v_doctor uuid;
  v_xmin text;
begin
  select patient_id, doctor_id, xmin::text into v_patient, v_doctor, v_xmin
    from public.prescriptions where id = new.prescription_id;
  if v_patient is null then
    raise exception 'La receta no existe.';
  end if;
  -- Los medicamentos solo se agregan en la misma transacción que creó la receta.
  if v_xmin is distinct from (pg_current_xact_id()::xid)::text then
    raise exception 'No se pueden agregar medicamentos a una receta ya guardada.';
  end if;
  if v_doctor is distinct from auth.uid() then
    raise exception 'Solo el doctor que receta agrega los medicamentos.';
  end if;
  new.patient_id = v_patient;
  return new;
end;
$$;

revoke execute on function public.stamp_prescription() from public, anon, authenticated;
revoke execute on function public.stamp_prescription_item() from public, anon, authenticated;

create trigger prescriptions_stamp
  before insert or update on public.prescriptions
  for each row execute function public.stamp_prescription();
create trigger prescriptions_audit
  after insert or update or delete on public.prescriptions
  for each row execute function public.audit_row();

create trigger prescription_items_stamp
  before insert on public.prescription_items
  for each row execute function public.stamp_prescription_item();
create trigger prescription_items_audit
  after insert or update or delete on public.prescription_items
  for each row execute function public.audit_row();

-- ---------- Crear receta con sus medicamentos (una transacción) ----------
-- items: [{"medication": "...", "dose": "...", "frequency": "...",
--          "duration": "...", "quantity": "...", "instructions": "..."}]
create or replace function public.create_prescription(
  p_patient_id uuid,
  p_items jsonb,
  p_indications text default null,
  p_appointment_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_item jsonb;
  v_position smallint := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La receta necesita al menos un medicamento.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Una receta admite hasta 20 medicamentos.';
  end if;

  insert into public.prescriptions (patient_id, appointment_id, indications)
  values (p_patient_id, p_appointment_id, nullif(trim(p_indications), ''))
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    insert into public.prescription_items
      (prescription_id, position, medication, dose, frequency, duration, quantity, instructions)
    values (
      v_id, v_position,
      trim(v_item ->> 'medication'),
      nullif(trim(v_item ->> 'dose'), ''),
      nullif(trim(v_item ->> 'frequency'), ''),
      nullif(trim(v_item ->> 'duration'), ''),
      nullif(trim(v_item ->> 'quantity'), ''),
      nullif(trim(v_item ->> 'instructions'), '')
    );
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.create_prescription(uuid, jsonb, text, uuid) from public, anon;
grant execute on function public.create_prescription(uuid, jsonb, text, uuid) to authenticated;

-- ---------- Permisos ----------

alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;

create policy "prescriptions: ver"
  on public.prescriptions for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );
create policy "prescriptions: doctor receta"
  on public.prescriptions for insert to authenticated
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id)
  );
create policy "prescriptions: doctor anula la suya"
  on public.prescriptions for update to authenticated
  using ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()))
  with check ((select public.get_my_role()) = 'doctor' and doctor_id = (select auth.uid()));

create policy "prescription_items: ver"
  on public.prescription_items for select to authenticated
  using (exists (select 1 from public.prescriptions r where r.id = prescription_id));
create policy "prescription_items: doctor agrega"
  on public.prescription_items for insert to authenticated
  with check ((select public.get_my_role()) = 'doctor');

-- Sin DELETE; la receta solo se anula y los medicamentos no se editan.
grant select, insert, update on public.prescriptions to authenticated;
grant select, insert on public.prescription_items to authenticated;
