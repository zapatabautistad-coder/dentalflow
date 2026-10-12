# Huella digital (WebAuthn) como segundo paso — EN PAUSA

**Estado (2026-10-12, decisión de Darys):** en pausa. El código está listo en el PR 48 (rama
`copilot/huella-webauthn`, en borrador), pero Supabase en la nube **no permite activar** la huella como
segundo paso. Diseño y prompt original: C2 en `06-prompts-para-agentes.md`.

## Qué bloquea
- Al activar la opción con la API de administración (`PATCH /v1/projects/{ref}/config/auth` con
  `mfa_web_authn_enroll_enabled` y `mfa_web_authn_verify_enabled` en `true`), Supabase responde:
  *"Enabling of MFA with WebAuthn not currently supported"*. El panel tampoco la muestra
  (Authentication → Multi-Factor solo trae app autenticadora y SMS).
- En Supabase local sí funciona: las E2E del PR 48 (`e2e/13-huella.spec.ts`) pasan con el autenticador
  virtual de Chromium.
- **Passkeys** (Authentication → Passkeys, entrar sin contraseña) no sirve de reemplazo: según el código de
  Supabase Auth, esa sesión queda en `aal1`, no cuenta como segundo paso. Se dejó **apagado**.

## Lo que ya está hecho
- Migración **032** aplicada en producción (2026-10-11): `mfa_satisfied()` cuenta un factor `webauthn`
  verificado igual que uno `totp`. Sin huellas registradas no cambia nada.
- PR 48 revisado dos veces por Claude: autenticador del equipo (no llave USB), un botón por equipo al
  entrar, limpieza de huellas a medio registrar, y `deactivateAccount` que no toca Auth si el perfil no
  es de la propia clínica. CI verde (48 E2E).

## Para retomarlo
1. Comprobar si Supabase ya lo permite: el mismo `PATCH` de arriba con un token de 24 h con permisos
   **Auth Config** y **Project settings** en lectura y escritura. Si responde sin error, volver a leer
   la configuración y confirmar `True` en las dos opciones `mfa_web_authn_*`.
2. Los datos del dominio son `webauthn_rp_id = dentalflow-navy.vercel.app`,
   `webauthn_rp_origins = https://dentalflow-navy.vercel.app` y nombre `DentalFlow`. Cambiar el dominio
   después invalida las huellas registradas.
3. Actualizar el PR 48 con `main`, pasar CI y probar en la app real (no en vistas previas de Vercel):
   agregar huella en Seguridad, cerrar sesión y entrar con "Usar huella".

## Se puede rescatar antes
Del PR 48 sirve hoy, sin huella: al desactivar una cuenta se borran sus métodos de verificación (al
reactivarla, admin y doctor activan la app autenticadora de nuevo) y el bloqueo para no tocar en Auth
cuentas de otra clínica. Va en un PR pequeño aparte si Darys lo pide.
