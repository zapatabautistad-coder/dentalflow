-- 031 · MFA fase 2: la base exige el segundo paso, no solo la app.
--
-- Misma regla que src/lib/mfa.ts (getMfaDecision):
--   * Quien tiene un factor TOTP verificado necesita sesión aal2.
--   * Admin y doctor necesitan aal2 siempre (sin factor deben activarlo primero).
--   * Recepción y asistente dental sin factor entran con contraseña (aal1).
-- Sin cumplirla, get_my_role() y is_platform_admin() no devuelven nada, así que
-- todas las políticas (que dependen de get_my_role) y las funciones de plataforma
-- cierran el acceso aunque alguien se salte el proxy y llame a la API directo.
--
-- get_my_clinic() NO se toca: solo filtra por clínica y sin rol no da acceso a
-- nada. Antes del segundo paso el usuario solo puede leer su propio perfil (para
-- que el proxy decida si va a /login/verificar o a /seguridad) y el nombre de su
-- clínica.

create or replace function public.mfa_satisfied()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
      or (
        not exists (
          select 1 from auth.mfa_factors f
           where f.user_id = (select auth.uid())
             and f.factor_type = 'totp'
             and f.status = 'verified'
        )
        and not exists (
          select 1 from public.profiles p
           where p.id = (select auth.uid())
             and p.role in ('admin', 'doctor')
        )
      );
$$;
revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

create or replace function public.get_my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role
    from public.profiles p
    join public.clinics c on c.id = p.clinic_id and c.active
   where p.id = auth.uid() and p.active
     and public.mfa_satisfied();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
     and public.mfa_satisfied();
$$;

-- El propio perfil se puede leer antes del segundo paso (solo esa fila; la
-- política restrictiva "aislamiento por clínica" sigue aplicando y un usuario
-- desactivado no la pasa).
create policy "profiles: ver el mío"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
