-- =============================================================
-- DentalFlow · Migración 030 · Plataforma: alta de clínicas nuevas
-- Solo los "administradores de plataforma" (el dueño de DentalFlow) crean
-- clínicas, activan/desactivan clínicas y nombran al primer admin de cada una.
-- Un admin de clínica NO puede hacer nada de esto. Nada se borra; auditado.
-- La lista de administradores de plataforma solo se cambia con SQL directo
-- (no hay política ni permiso para hacerlo desde la app).
-- =============================================================

create table public.platform_admins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete restrict,
  created_at  timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- Sin políticas ni GRANT: nadie la lee ni la escribe desde la API.

-- No va a audit_log (esa bitácora es por clínica y exige clinic_id). Esta lista
-- solo cambia con SQL directo del dueño, que queda en el historial de Supabase.

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Crear una clínica nueva. Devuelve su id.
create or replace function public.platform_create_clinic(
  p_name text, p_address text default null, p_phone text default null, p_tax_id text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede crear clínicas.';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Escribe el nombre de la clínica.';
  end if;
  insert into public.clinics (name, address, phone, tax_id)
  values (trim(p_name), nullif(trim(p_address), ''), nullif(trim(p_phone), ''), nullif(trim(p_tax_id), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Activar o desactivar una clínica (desactivada: sus usuarios quedan sin acceso).
create or replace function public.platform_set_clinic_active(p_clinic uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede activar o desactivar clínicas.';
  end if;
  update public.clinics set active = p_active where id = p_clinic;
  if not found then
    raise exception 'La clínica no existe.';
  end if;
end;
$$;

-- Nombrar el PRIMER admin de una clínica que todavía no tiene ninguno.
-- El usuario lo crea el servidor (Auth admin API) con app_metadata.clinic_id.
create or replace function public.platform_assign_first_admin(p_user uuid, p_clinic uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede nombrar el primer administrador.';
  end if;
  if exists (select 1 from public.profiles where clinic_id = p_clinic and role = 'admin' and active) then
    raise exception 'Esta clínica ya tiene un administrador. Los demás los crea él en Cuentas.';
  end if;
  update public.profiles set role = 'admin'
   where id = p_user and clinic_id = p_clinic;
  if not found then
    raise exception 'El usuario no pertenece a esa clínica.';
  end if;
end;
$$;

-- Lista de clínicas para la pantalla de plataforma.
create or replace function public.platform_list_clinics()
returns table (id uuid, name text, active boolean, created_at timestamptz, admins bigint, patients bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo la plataforma puede ver todas las clínicas.';
  end if;
  return query
    select c.id, c.name, c.active, c.created_at,
           (select count(*) from public.profiles p where p.clinic_id = c.id and p.role = 'admin' and p.active),
           (select count(*) from public.patients t where t.clinic_id = c.id)
      from public.clinics c
     order by c.created_at;
end;
$$;

revoke all on function public.platform_create_clinic(text, text, text, text) from public, anon;
revoke all on function public.platform_set_clinic_active(uuid, boolean) from public, anon;
revoke all on function public.platform_assign_first_admin(uuid, uuid) from public, anon;
revoke all on function public.platform_list_clinics() from public, anon;
grant execute on function public.platform_create_clinic(text, text, text, text) to authenticated;
grant execute on function public.platform_set_clinic_active(uuid, boolean) to authenticated;
grant execute on function public.platform_assign_first_admin(uuid, uuid) to authenticated;
grant execute on function public.platform_list_clinics() to authenticated;
