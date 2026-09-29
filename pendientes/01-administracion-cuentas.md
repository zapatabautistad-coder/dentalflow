# Administración de cuentas (crear usuarios desde la app)

**Estado:** hecho. Pantalla `/accounts` (solo Admin), migración 015 aplicada en producción y `SUPABASE_SERVICE_ROLE_KEY` puesta en Vercel (Production, tipo Secret).

**Qué hace:**
- Crear usuario: nombre, correo, contraseña temporal (regla de 10 caracteres) y rol. Usa la API de administración de Supabase Auth; el trigger `handle_new_user` crea el perfil y el rol lo asigna el admin con su sesión (queda en `audit_log`).
- Cambiar rol de un usuario existente.
- Desactivar con motivo obligatorio (en vez de borrar) y reactivar. Desactivado = sin acceso a datos al instante (RLS) y bloqueado para iniciar sesión.

**Pendiente opcional:** para probar la pantalla en local, agregar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (nunca en el chat ni en git). Sin la clave, la pantalla solo muestra la lista y un aviso.
