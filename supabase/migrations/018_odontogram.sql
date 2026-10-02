-- =============================================================
-- DentalFlow · Migración 018 · Odontograma real
-- Cada hallazgo del odontograma es una entrada (diente FDI, superficies
-- y condición). Igual que el registro clínico: lo guardado NO se edita ni
-- se borra (sin UPDATE ni DELETE); un error se corrige con otra entrada
-- que apunta a la original, con motivo obligatorio. Autor, rol y hora los
-- pone la base de datos. Escribe solo el doctor; todos los roles leen.
-- El estado actual de cada diente se calcula en la app a partir del
-- historial (src/lib/odontogram.ts).
-- =============================================================

create type public.odontogram_condition as enum (
  'sano',                -- diente sano: reinicia el estado del diente
  'caries',              -- por superficie
  'obturacion',          -- restauración, por superficie
  'sellante',            -- por superficie
  'corona',
  'endodoncia',
  'fractura',
  'extraccion_indicada',
  'ausente',
  'implante'
);

create table public.odontogram_entries (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.patients (id) on delete restrict,

  -- Numeración FDI: permanentes 11–48, temporales 51–85.
  tooth              smallint not null check (
    (tooth / 10 between 1 and 4 and tooth % 10 between 1 and 8)
    or (tooth / 10 between 5 and 8 and tooth % 10 between 1 and 5)
  ),
  -- M mesial, D distal, O oclusal/incisal, V vestibular, L lingual/palatino.
  surfaces           text[] check (
    surfaces is null
    or (cardinality(surfaces) between 1 and 5 and surfaces <@ array['M', 'D', 'O', 'V', 'L'])
  ),
  -- Null solo en una corrección que anula sin reemplazar.
  condition          public.odontogram_condition,
  note               text check (note is null or length(note) <= 500),

  corrects_entry_id  uuid references public.odontogram_entries (id) on delete restrict,
  correction_reason  text check (correction_reason is null or length(correction_reason) <= 500),

  author_id          uuid references public.profiles (id) on delete set null,
  author_role        public.user_role,
  created_at         timestamptz not null default now(),

  -- Caries, obturación y sellante van por superficie; el resto es del diente entero.
  constraint odontogram_entries_surfaces check (
    condition is null
    or (condition in ('caries', 'obturacion', 'sellante') and surfaces is not null)
    or (condition not in ('caries', 'obturacion', 'sellante') and surfaces is null)
  ),
  constraint odontogram_entries_content check (
    condition is not null or corrects_entry_id is not null
  ),
  constraint odontogram_entries_correction check (
    (corrects_entry_id is null and correction_reason is null)
    or (corrects_entry_id is not null and length(trim(coalesce(correction_reason, ''))) >= 5)
  )
);

-- Cada entrada se corrige una sola vez.
create unique index odontogram_entries_one_correction
  on public.odontogram_entries (corrects_entry_id)
  where corrects_entry_id is not null;

create index odontogram_entries_patient_idx
  on public.odontogram_entries (patient_id, created_at);

create or replace function public.stamp_odontogram_entry()
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

  if new.corrects_entry_id is not null then
    select patient_id into v_original_patient
      from public.odontogram_entries
      where id = new.corrects_entry_id;
    if v_original_patient is distinct from new.patient_id then
      raise exception 'La corrección debe ser del mismo paciente que la entrada original.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_odontogram_entry() from public, anon, authenticated;

create trigger odontogram_entries_stamp
  before insert on public.odontogram_entries
  for each row execute function public.stamp_odontogram_entry();

create trigger odontogram_entries_audit
  after insert or update or delete on public.odontogram_entries
  for each row execute function public.audit_row();

alter table public.odontogram_entries enable row level security;

create policy "odontogram_entries: ver"
  on public.odontogram_entries for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Solo el doctor registra hallazgos del odontograma.
create policy "odontogram_entries: registrar"
  on public.odontogram_entries for insert to authenticated
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Sin políticas ni permisos de UPDATE/DELETE: lo registrado no cambia.
grant select, insert on public.odontogram_entries to authenticated;
