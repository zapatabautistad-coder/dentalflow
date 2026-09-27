-- ⚠️ NO EJECUTAR. Nunca se aplicó en producción y rompería el registro de usuarios:
-- redefine handle_new_user() para escribir profiles.email, columna que no existe.
-- Lo que sí hacía falta (expediente y seguro) ya lo cubre la 004.

-- =============================================================
-- DentalFlow · Migración 005 · profiles + patients + RLS completo
-- Pegar completo en el SQL Editor de Supabase.
-- =============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and schemaname = 'public') then
    create type public.user_role as enum ('doctor', 'recepcion', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'insurance_type' and schemaname = 'public') then
    create type public.insurance_type as enum ('ars', 'privado');
  end if;
end $$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'recepcion',
  phone       text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.patients (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  document_id        text unique,
  birth_date         date,
  phone              text not null,
  email              text,
  notes              text,
  record_number      integer generated always as identity unique,
  insurance_type     public.insurance_type,
  insurance_provider text,
  affiliate_number   text,
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists patients_updated_at on public.patients;
create trigger patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- Trigger de creación de perfil al registrar un usuario.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.patients enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles: ver (autenticados)" on public.profiles;
create policy "profiles: ver (autenticados)"
on public.profiles
for select to authenticated
using (true);

drop policy if exists "profiles: admin gestiona" on public.profiles;
create policy "profiles: admin gestiona"
on public.profiles
for all to authenticated
using ((select public.get_my_role()) = 'admin')
with check ((select public.get_my_role()) = 'admin');

-- ---------- patients ----------
drop policy if exists "patients: admin y recepcion gestionan" on public.patients;
create policy "patients: admin y recepcion gestionan"
on public.patients
for all to authenticated
using ((select public.get_my_role()) in ('admin', 'recepcion'))
with check ((select public.get_my_role()) in ('admin', 'recepcion'));

drop policy if exists "patients: doctor ve sus pacientes" on public.patients;
create policy "patients: doctor ve sus pacientes"
on public.patients
for select to authenticated
using (
  (select public.get_my_role()) = 'doctor'
  and (
    exists (
      select 1 from public.appointments a
      where a.patient_id = patients.id
        and a.doctor_id = (select auth.uid())
    )
    or exists (
      select 1 from public.queue q
      where q.patient_id = patients.id
        and q.doctor_id = (select auth.uid())
    )
  )
);

-- ---------- integridad del seguro ----------
alter table public.patients
  drop constraint if exists patients_insurance_consistency;

alter table public.patients
  add constraint patients_insurance_consistency check (
    (insurance_type = 'ars' and insurance_provider is not null and affiliate_number is not null)
    or (insurance_type = 'privado' and insurance_provider is null and affiliate_number is null)
    or insurance_type is null
  );

-- ---------- permisos ----------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.patients to authenticated;
