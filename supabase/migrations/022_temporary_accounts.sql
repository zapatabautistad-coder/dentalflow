-- =============================================================
-- DentalFlow · Migración 022 · Cuentas temporales (visitas)
-- - Una cuenta con guest_expires_at es temporal: funciona con su rol hasta
--   esa hora. Al vencer, get_my_role() devuelve null y deja de ver todo.
-- - Al cerrar sesión la app la desactiva (ver src/lib/guest.ts).
-- - Si intenta entrar de nuevo, se guarda una solicitud de acceso que el
--   admin ve en notificaciones y en Cuentas. La crea solo el servidor.
-- - Las cuentas del personal tienen guest_expires_at null (no vencen).
-- =============================================================

alter table public.profiles
  add column guest_expires_at timestamptz;

-- Usuario desactivado o cuenta temporal vencida = sin rol = sin acceso.
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = auth.uid()
    and active
    and (guest_expires_at is null or guest_expires_at > now());
$$;

create table public.access_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete restrict,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.profiles (id) on delete set null
);

create index access_requests_open_idx on public.access_requests (created_at desc) where resolved_at is null;

create or replace function public.stamp_access_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.resolved_at = null;
    new.resolved_by = null;
    return new;
  end if;
  if new.id is distinct from old.id or new.profile_id is distinct from old.profile_id or new.created_at is distinct from old.created_at then
    raise exception 'Una solicitud de acceso no se edita.';
  end if;
  if old.resolved_at is not null then
    raise exception 'Esta solicitud ya fue atendida.';
  end if;
  if new.resolved_at is not null then
    new.resolved_at = now();
    new.resolved_by = auth.uid();
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_access_request() from public, anon, authenticated;

create trigger access_requests_stamp
  before insert or update on public.access_requests
  for each row execute function public.stamp_access_request();

create trigger access_requests_audit
  after insert or update or delete on public.access_requests
  for each row execute function public.audit_row();

alter table public.access_requests enable row level security;

create policy "access_requests: admin ve" on public.access_requests
  for select to authenticated using ((select public.get_my_role()) = 'admin');
create policy "access_requests: admin atiende" on public.access_requests
  for update to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

-- Sin INSERT para usuarios: las crea solo el servidor. Sin DELETE.
grant select, update on public.access_requests to authenticated;
