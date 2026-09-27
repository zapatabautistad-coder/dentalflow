-- =============================================================
-- DentalFlow · Migración 012 · Registro clínico inmutable
-- Notas de evolución, medicamentos administrados y procedimientos.
-- Una entrada guardada NO se edita ni se borra (no hay permiso UPDATE
-- ni DELETE). Un error se corrige con una entrada nueva que apunta a la
-- original y lleva motivo obligatorio. Autor, rol y hora los pone la
-- base de datos.
-- =============================================================

create type public.clinical_entry_kind as enum ('nota', 'medicamento', 'procedimiento');

create table public.clinical_entries (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.patients (id) on delete restrict,
  kind               public.clinical_entry_kind not null,

  body               text check (body is null or length(body) <= 4000),

  medication_name    text check (medication_name is null or length(medication_name) <= 200),
  dose               text check (dose is null or length(dose) <= 100),
  route              text check (route is null or length(route) <= 100),
  administered_at    timestamptz,

  corrects_entry_id  uuid references public.clinical_entries (id) on delete restrict,
  correction_reason  text check (correction_reason is null or length(correction_reason) <= 500),

  author_id          uuid references public.profiles (id) on delete set null,
  author_role        public.user_role,
  created_at         timestamptz not null default now(),

  constraint clinical_entries_content check (
    (kind = 'medicamento'
      and length(trim(coalesce(medication_name, ''))) > 0
      and length(trim(coalesce(dose, ''))) > 0
      and length(trim(coalesce(route, ''))) > 0
      and administered_at is not null)
    or (kind in ('nota', 'procedimiento') and length(trim(coalesce(body, ''))) > 0)
  ),
  constraint clinical_entries_correction check (
    (corrects_entry_id is null and correction_reason is null)
    or (corrects_entry_id is not null and length(trim(coalesce(correction_reason, ''))) >= 5)
  )
);

-- Cada entrada se corrige una sola vez (la corrección puede corregirse a su vez).
create unique index clinical_entries_one_correction
  on public.clinical_entries (corrects_entry_id)
  where corrects_entry_id is not null;

create index clinical_entries_patient_idx on public.clinical_entries (patient_id, created_at desc);

create or replace function public.stamp_clinical_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_original_patient uuid;
begin
  new.author_id = auth.uid();
  new.author_role = (select public.get_my_role());
  new.created_at = now();

  if new.administered_at is not null and new.administered_at > now() + interval '5 minutes' then
    raise exception 'La hora de administración no puede estar en el futuro.';
  end if;

  if new.corrects_entry_id is not null then
    select patient_id into v_original_patient
      from public.clinical_entries
      where id = new.corrects_entry_id;
    if v_original_patient is distinct from new.patient_id then
      raise exception 'La corrección debe ser del mismo paciente que la entrada original.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_clinical_entry() from public, anon, authenticated;

create trigger clinical_entries_stamp
  before insert on public.clinical_entries
  for each row execute function public.stamp_clinical_entry();

create trigger clinical_entries_audit
  after insert or update or delete on public.clinical_entries
  for each row execute function public.audit_row();

alter table public.clinical_entries enable row level security;

create policy "clinical_entries: ver"
  on public.clinical_entries for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Solo el personal clínico registra; recepción y admin solo leen.
create policy "clinical_entries: registrar"
  on public.clinical_entries for insert to authenticated
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Sin políticas ni permisos de UPDATE/DELETE: lo registrado no cambia.
grant select, insert on public.clinical_entries to authenticated;
