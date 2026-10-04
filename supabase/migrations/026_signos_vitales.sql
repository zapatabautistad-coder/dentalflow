-- =============================================================
-- DentalFlow · Migración 026 · Signos vitales
-- Toma de presión arterial, frecuencia cardíaca, glucemia y saturación
-- antes de un procedimiento (sobre todo con anestesia en hipertensos,
-- diabéticos o cardiópatas). Igual que el registro clínico: solo INSERT y
-- SELECT; un error se corrige con otra entrada (corrects_entry_id + motivo).
-- Autor, rol y hora los pone la base. Registran doctor y asistente dental
-- (enfermeria); todos los roles leen. La cita es opcional y debe ser del
-- mismo paciente. Auditado, sin UPDATE ni DELETE.
-- =============================================================

create table public.vital_signs (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients (id) on delete restrict,
  appointment_id      uuid references public.appointments (id) on delete restrict,

  systolic            smallint check (systolic is null or systolic between 60 and 260),
  diastolic           smallint check (diastolic is null or diastolic between 30 and 160),
  heart_rate          smallint check (heart_rate is null or heart_rate between 30 and 220),
  glucose_mg_dl       smallint check (glucose_mg_dl is null or glucose_mg_dl between 20 and 600),
  oxygen_saturation   smallint check (oxygen_saturation is null or oxygen_saturation between 50 and 100),
  note                text check (note is null or length(note) <= 500),

  corrects_entry_id   uuid references public.vital_signs (id) on delete restrict,
  correction_reason   text check (correction_reason is null or length(trim(correction_reason)) between 5 and 500),

  author_id           uuid references public.profiles (id) on delete set null,
  author_role         public.user_role,
  created_at          timestamptz not null default now(),

  -- La presión va completa (sistólica y diastólica) o no va.
  constraint vital_signs_bp_pair check ((systolic is null) = (diastolic is null)),
  constraint vital_signs_bp_order check (systolic is null or systolic > diastolic),
  -- Al menos una medida.
  constraint vital_signs_some_value check (
    systolic is not null or heart_rate is not null or glucose_mg_dl is not null or oxygen_saturation is not null
  ),
  -- Corrección con motivo, o ninguna de las dos.
  constraint vital_signs_correction check ((corrects_entry_id is null) = (correction_reason is null))
);

create index vital_signs_patient_idx on public.vital_signs (patient_id, created_at);
create index vital_signs_appointment_idx on public.vital_signs (appointment_id);
create index vital_signs_corrects_idx on public.vital_signs (corrects_entry_id);
create index vital_signs_author_idx on public.vital_signs (author_id);

create or replace function public.stamp_vital_signs()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_patient uuid;
begin
  new.author_id = auth.uid();
  new.author_role = (select public.get_my_role());
  new.created_at = now();

  if new.appointment_id is not null then
    select patient_id into v_patient from public.appointments where id = new.appointment_id;
    if v_patient is distinct from new.patient_id then
      raise exception 'La cita no es de este paciente.';
    end if;
  end if;

  if new.corrects_entry_id is not null then
    select patient_id into v_patient from public.vital_signs where id = new.corrects_entry_id;
    if v_patient is distinct from new.patient_id then
      raise exception 'La corrección debe ser del mismo paciente que la toma original.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_vital_signs() from public, anon, authenticated;

create trigger vital_signs_stamp
  before insert on public.vital_signs
  for each row execute function public.stamp_vital_signs();

create trigger vital_signs_audit
  after insert or update or delete on public.vital_signs
  for each row execute function public.audit_row();

alter table public.vital_signs enable row level security;

create policy "vital_signs: ver"
  on public.vital_signs for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "vital_signs: registrar"
  on public.vital_signs for insert to authenticated
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Solo INSERT y SELECT: una toma no se edita ni se borra; se corrige con otra.
grant select, insert on public.vital_signs to authenticated;
