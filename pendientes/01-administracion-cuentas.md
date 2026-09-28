# Administración de cuentas (crear usuarios desde la app)

**Qué hace:** pantalla "Cuentas" (solo Admin) para crear usuarios, asignar rol y desactivarlos, sin entrar a Supabase.

**Bloqueado por (lo pone el dueño del proyecto):**
1. Copiar la clave secreta `service_role` de Supabase (*Project Settings → API Keys*).
2. Agregarla en Vercel como `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, sin `NEXT_PUBLIC_`).
3. Agregar la misma variable en `.env.local` para probar localmente.

**Diseño acordado:**
- Crear usuario: nombre, correo, contraseña temporal, rol → usa la API de administración de Supabase Auth (con la `service_role`); el trigger `handle_new_user` ya existente crea el perfil.
- Cambiar rol de un usuario existente.
- "Desactivar" en vez de borrar (como archivar pacientes): columna `activo` en `profiles`, auditada con el mismo trigger de `audit_log`. Si está inactivo, no puede iniciar sesión.
- Migración nueva (014) para la columna `activo` + su GRANT.

**Estado:** no iniciado. Avisar cuando la clave esté puesta en los 3 lugares.
