-- =============================================================
-- DentalFlow · Migración 031 · Consentimiento del paciente para IA (ONYX)
-- Antes de usar voz o IA con un paciente, la clínica registra si el
-- paciente acepta o no. Dos alcances:
--   * dictado:   la voz del doctor al dictar notas de su caso se envía a
--                OpenAI (Whisper, transcripción) y a Anthropic (Claude, ordena).
--   * ambiental: grabación de la conversación de la consulta.
-- Solo INSERT y SELECT: el consentimiento no se edita ni se borra; el
-- paciente lo retira con otra entrada (granted = false). Vale la última.
-- consent_version dice qué texto se le leyó (el texto vive en
-- src/lib/ai-consent.ts; una versión publicada nunca se cambia, se agrega
-- otra). Quién y cuándo lo pone la base. Lo registran y lo ven todos los
-- roles de la clínica. No se registra en un paciente archivado. Auditado.
-- =============================================================

create table public.ai_consents (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients (id) on delete restrict,
  clinic_id        uuid not null references public.clinics (id),
  scope            text not null check (scope in ('dictado', 'ambiental')),
  granted          boolean not null,
  consent_version  text not null check (consent_version in ('v1')),
  note             text check (note is null or length(note) <= 500),

  recorded_by      uuid references public.profiles (id) on delete set null,
  recorded_role    public.user_role,
  created_at       timestamptz not null default now()
);

create index ai_consents_patient_idx on public.ai_consents (patient_id, scope, created_at);
create index ai_consents_clinic_id_idx on public.ai_consents (clinic_id);
create index ai_consents_recorded_by_idx on public.ai_consents (recorded_by);

create or replace function public.stamp_ai_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.patients where id = new.patient_id and archived_at is not null) then
    raise exception 'El paciente está archivado.';
  end if;

  new.recorded_by = auth.uid();
  new.recorded_role = (select public.get_my_role());
  new.created_at = now();
  return new;
end;
$$;

revoke execute on function public.stamp_ai_consent() from public, anon, authenticated;

-- "a0_" corre antes que cualquier otro trigger BEFORE (clínica del paciente).
create trigger a0_set_clinic_id
  before insert or update on public.ai_consents
  for each row execute function public.set_clinic_id();

create trigger ai_consents_stamp
  before insert on public.ai_consents
  for each row execute function public.stamp_ai_consent();

create trigger ai_consents_audit
  after insert or update or delete on public.ai_consents
  for each row execute function public.audit_row();

alter table public.ai_consents enable row level security;

-- Aislamiento entre clínicas (igual que 029): se suma con AND a las demás.
create policy "aislamiento por clínica" on public.ai_consents
  as restrictive for all to authenticated
  using (clinic_id = (select public.get_my_clinic()))
  with check (clinic_id = (select public.get_my_clinic()));

create policy "ai_consents: ver"
  on public.ai_consents for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "ai_consents: registrar"
  on public.ai_consents for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

-- Solo INSERT y SELECT: se retira con otra entrada, nunca se edita ni se borra.
grant select, insert on public.ai_consents to authenticated;
