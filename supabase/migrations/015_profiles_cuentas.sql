-- =============================================================
-- DentalFlow · Migración 015 · Cuentas de usuario
-- - Un usuario no se borra: se desactiva con motivo (como archivar pacientes).
-- - Quién y cuándo desactivó lo pone la base de datos.
-- - Un usuario desactivado pierde el acceso a todos los datos al instante:
--   get_my_role() devuelve null y ninguna política RLS lo deja pasar.
-- - El admin no puede desactivarse ni cambiar su propio rol, y siempre
--   queda al menos un admin activo.
-- - Sin DELETE y con auditoría (audit_log).
-- =============================================================

alter table public.profiles
  add column active boolean not null default true,
  add column deactivated_at timestamptz,
  add column deactivated_by uuid references auth.users (id),
  add column deactivated_reason text,
  add constraint profiles_deactivated_reason_required
    check (active or length(trim(coalesce(deactivated_reason, ''))) > 0);

create or replace function public.stamp_profile()
returns trigger
language plpgsql
set search_path = ''
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

  -- Siempre debe quedar al menos un admin activo.
  if old.role = 'admin' and old.active
     and (new.role is distinct from 'admin' or not new.active)
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and active and id <> old.id
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

revoke execute on function public.stamp_profile() from public, anon, authenticated;

create trigger profiles_stamp
  before update on public.profiles
  for each row execute function public.stamp_profile();

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row();

-- Usuario desactivado = sin rol = sin acceso.
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active;
$$;

-- Solo usuarios activos ven la lista de usuarios.
drop policy "profiles: ver (autenticados)" on public.profiles;
create policy "profiles: ver (activos)"
  on public.profiles for select to authenticated
  using ((select public.get_my_role()) is not null);

revoke delete on public.profiles from authenticated;
