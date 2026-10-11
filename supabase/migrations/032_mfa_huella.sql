-- 032 · Huella digital (WebAuthn) como segundo paso, además de la app autenticadora.
--
-- La huella (Touch ID, Windows Hello, lector del celular) se registra en Supabase Auth
-- como factor MFA de tipo 'webauthn'. Al verificarla, la sesión sube a aal2, igual que
-- con el código de 6 dígitos, así que la regla de 031 no cambia:
--   * Quien tiene un factor verificado necesita sesión aal2.
--   * Admin y doctor necesitan aal2 siempre.
-- Lo único nuevo: un factor 'webauthn' verificado cuenta igual que uno 'totp'. Sin esto,
-- alguien con solo huella (aal1) pasaría como "sin factor" si es recepción o asistente.
--
-- Es opcional: en la app solo se ofrece a quien ya tiene la app autenticadora activa
-- (queda como respaldo si se pierde el equipo). No es inicio de sesión sin contraseña.

create or replace function public.mfa_satisfied()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
      or (
        not exists (
          select 1 from auth.mfa_factors f
           where f.user_id = (select auth.uid())
             and f.factor_type in ('totp', 'webauthn')
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
