-- =============================================================
-- DentalFlow · Migración 001 · Esquema del MVP
-- Tablas: profiles, patients, appointments, queue
-- Pegar completo en el SQL Editor de Supabase.
-- =============================================================

-- -------------------------------------------------------------
-- Tipos
-- -------------------------------------------------------------
create type public.user_role as enum ('doctor', 'recepcion', 'admin');

create type public.appointment_status as enum (
  'programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'
);

create type public.queue_status as enum (
  'en_espera', 'llamado', 'en_atencion', 'atendido', 'cancelado'
);

-- -------------------------------------------------------------
-- Utilidades
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- profiles: un perfil por usuario de auth.users
-- -------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'recepcion',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse un usuario.
-- El rol NO se toma de los metadatos (el usuario podría elegir "admin");
-- siempre empieza como 'recepcion' y un admin lo cambia después.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rol del usuario actual. SECURITY DEFINER para leer profiles sin
-- pasar por RLS (evita recursión en las políticas).
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- -------------------------------------------------------------
-- patients
-- -------------------------------------------------------------
create table public.patients (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  document_id  text unique,
  birth_date   date,
  phone        text,
  email        text,
  notes        text,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- appointments
-- -------------------------------------------------------------
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients (id) on delete cascade,
  doctor_id         uuid not null references public.profiles (id) on delete restrict,
  starts_at         timestamptz not null,
  duration_minutes  integer not null default 30 check (duration_minutes > 0),
  reason            text,
  status            public.appointment_status not null default 'programada',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index appointments_doctor_starts_idx on public.appointments (doctor_id, starts_at);
create index appointments_patient_idx on public.appointments (patient_id);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- queue: turnos del día (sala de espera)
-- -------------------------------------------------------------
create table public.queue (
  id              uuid primary key default gen_random_uuid(),
  queue_date      date not null default current_date,
  position        integer not null check (position > 0),
  patient_id      uuid not null references public.patients (id) on delete cascade,
  appointment_id  uuid references public.appointments (id) on delete set null,
  doctor_id       uuid references public.profiles (id) on delete set null,
  status          public.queue_status not null default 'en_espera',
  checked_in_at   timestamptz not null default now(),
  called_at       timestamptz,
  finished_at     timestamptz,
  unique (queue_date, position)
);

create index queue_doctor_date_idx on public.queue (doctor_id, queue_date);
create index queue_patient_idx on public.queue (patient_id);

-- =============================================================
-- RLS
-- =============================================================
alter table public.profiles     enable row level security;
alter table public.patients     enable row level security;
alter table public.appointments enable row level security;
alter table public.queue        enable row level security;

-- ---------- profiles ----------
-- Todos los usuarios logueados ven los perfiles (p. ej. lista de doctores).
create policy "profiles: ver (autenticados)"
  on public.profiles for select to authenticated
  using (true);

-- Solo admin crea/edita/borra perfiles (incluye cambiar roles).
create policy "profiles: admin gestiona"
  on public.profiles for all to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- ---------- patients ----------
create policy "patients: admin y recepción gestionan"
  on public.patients for all to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'))
  with check ((select public.get_my_role()) in ('admin', 'recepcion'));

-- Doctor: solo pacientes con cita o turno asignado a él.
create policy "patients: doctor ve sus pacientes"
  on public.patients for select to authenticated
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

-- ---------- appointments ----------
create policy "appointments: admin y recepción gestionan"
  on public.appointments for all to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'))
  with check ((select public.get_my_role()) in ('admin', 'recepcion'));

create policy "appointments: doctor ve sus citas"
  on public.appointments for select to authenticated
  using (
    (select public.get_my_role()) = 'doctor'
    and doctor_id = (select auth.uid())
  );

-- ---------- queue ----------
create policy "queue: admin y recepción gestionan"
  on public.queue for all to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'))
  with check ((select public.get_my_role()) in ('admin', 'recepcion'));

create policy "queue: doctor ve sus turnos"
  on public.queue for select to authenticated
  using (
    (select public.get_my_role()) = 'doctor'
    and doctor_id = (select auth.uid())
  );
