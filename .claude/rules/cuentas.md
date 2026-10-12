---
paths:
  - "src/app/**/accounts/**"
  - "src/app/**/seguridad/**"
  - "src/lib/supabase/admin.ts"
  - "src/lib/password*"
  - "src/lib/auth-ban*"
  - "supabase/migrations/015_*"
---
# Cuentas y contraseñas

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Cuentas (`/accounts`, solo admin, 015): crear usuario (API de Auth con `SUPABASE_SERVICE_ROLE_KEY`, solo servidor en `src/lib/supabase/admin.ts`), cambiar rol, desactivar con motivo y reactivar. Nunca se borran. Usuario desactivado: `get_my_role()` devuelve null (sin acceso a nada por RLS), queda bloqueado en Auth y se le borran sus métodos de verificación (al reactivarlo, admin y doctor activan la app autenticadora de nuevo). Desactivar y reactivar solo tocan Auth si el UPDATE del perfil cambió una fila (la clave de servicio salta RLS y vería otras clínicas). El trigger `stamp_profile` impide cambiar el propio rol o desactivarse y exige al menos un admin activo; `profiles` tiene auditoría y no tiene DELETE.
- Contraseñas (Supabase Auth): mínimo 10 caracteres con minúsculas, mayúsculas, números y símbolos. Pendiente al pasar a plan Pro: activar "Prevent use of leaked passwords".
