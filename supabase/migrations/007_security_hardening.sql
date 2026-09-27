-- =============================================================
-- DentalFlow · Migración 007 · Cerrar funciones internas
-- Corrige las advertencias de seguridad del asesor de Supabase.
-- =============================================================

-- get_my_role: la usan las políticas RLS, que corren como el usuario
-- que inició sesión, así que "authenticated" debe poder ejecutarla.
-- Nadie sin sesión (anon) debe poder llamarla.
revoke execute on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated;

-- handle_new_user es la función de un trigger y rls_auto_enable la de un
-- event trigger: Postgres las ejecuta sin comprobar este permiso, así que
-- nadie necesita llamarlas por la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- set_updated_at: search_path fijo para que no se pueda suplantar now().
alter function public.set_updated_at() set search_path = '';
