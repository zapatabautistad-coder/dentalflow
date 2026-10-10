# Revisión de seguridad (2026-10-04)

Revisado: proxy y sesión, `requireProfile`, acciones con clave de servicio (Cuentas), ruta
`/api/patients/lookup-cedula`, recibos, análisis, búsqueda de pacientes, enlaces de WhatsApp,
RLS y permisos de todas las tablas, funciones SECURITY DEFINER, cabeceras HTTP, dependencias.
Cada hallazgo se comprobó contra Supabase **local** (nunca producción).

## Corregido
1. **Cabecera de usuario falsificable (alta).** El proxy no corría en rutas que terminan en
   `.png/.svg/...` (p. ej. `/patients/x.png`); ahí la app aceptaba una cabecera `x-df-user-id`
   enviada por el usuario y lo trataba como admin (menú Cuentas visible). RLS seguía protegiendo
   los datos y "Crear cuenta" no se pudo forzar (Next la reenvía a `/accounts`, que sí pasa por
   el proxy). Arreglo: el proxy solo excluye archivos del primer nivel (`public/`).
   Prueba E2E en `01-roles`.
2. **Facturación visible en la auditoría (media).** `audit_log` mostraba a quien veía al paciente
   todos sus cambios: la asistente dental leía montos de cargos y pagos, y el doctor citas del
   paciente con otros doctores. Arreglo: migración **025** (cada fila se ve solo si el rol ve la
   tabla de origen). Prueba E2E en `04-clinico`. Aplicada en producción el 2026-10-04.
3. **Sin cabeceras de seguridad (media).** Se agregan en `next.config.ts`: X-Frame-Options DENY y
   `frame-ancestors 'none'` (clickjacking), HSTS, Referrer-Policy, Permissions-Policy.
4. **Búsqueda de pacientes (baja).** Se descartan también `*`, `"` y `\` del filtro de PostgREST.

## Bien hecho (sin cambios)
- Todas las tablas con RLS; `anon` sin acceso; nadie tiene DELETE ni TRUNCATE.
- Solo `get_my_role()` es SECURITY DEFINER ejecutable (intencional); todas las funciones fijan `search_path`.
- `audit_log` solo lectura: nadie puede escribir ni falsificar auditoría.
- Cuentas: la clave de servicio solo se usa tras comprobar admin, y el cambio de rol/desactivación
  va primero por RLS. `npm audit`: 0 vulnerabilidades.

## Pendiente (no es de código)
- "Prevent use of leaked passwords" al pasar a plan Pro de Supabase.
- Hallazgo de calidad: lo escrito antes de que la página termine de cargar puede perderse.
- Mejora opcional: Content-Security-Policy completa (requiere nonces en Next; más trabajo).

## Pendiente (2026-10-09): evitar código malicioso en producción
Riesgo: todo push a `main` se publica solo en Vercel. Quien suba código a `main` controla la app.

En el repo (lo puede hacer Claude en un PR pequeño, sin tocar la app):
1. **CI en GitHub Actions**: en cada PR, `npm ci`, build, lint y `npm test`. Si falla, no se une.
2. ~~**Dependabot**~~ Hecho (2026-10-10): `.github/dependabot.yml` en modo **solo seguridad** (`open-pull-requests-limit: 0`): no abre PR de versiones (TypeScript 7 y ESLint 10 rompían el build). Avisos por *Dependabot alerts*.
3. ~~**`CODEOWNERS`**~~ Hecho (2026-10-10): `.github/CODEOWNERS`; cambios en `supabase/migrations/`, `src/proxy.ts`, `src/lib/supabase/`,
   `next.config.ts`, `.github/` y `package*.json` requieren aprobación de Darys. Solo se exige si en la protección de `main` se activa "Require review from Code Owners".

Lo hace Darys en la configuración de las cuentas:
- 2FA (app autenticadora) en GitHub, Vercel y Supabase.
- Proteger `main`: solo por PR, CI obligatoria, sin force-push ni borrado.
- Revisar colaboradores y apps con acceso; activar secret scanning y push protection.
- Rotar `SUPABASE_SERVICE_ROLE_KEY` si alguna vez se pegó fuera de Vercel/`.env.local`.

## Pendiente (2026-10-09): los 3 riesgos mayores
1. ~~**Respaldos**~~ **Activo y verificado (2026-10-10)**: `respaldo-base.yml` corre cada noche
   (cifrado con age, 30 días en GitHub Actions). Se descargó el del 10-oct y la llave privada lo
   abrió. Llave privada en USB (y en papel). Falta (opcional): restaurarlo completo en el proyecto
   demo con `pg_restore` (`supabase/RESPALDO.md`). Plan Pro/PITR de Supabase sigue siendo un extra.
2. **Multi-tenant**: con una segunda clínica en la base actual, se verían los datos entre sí.
   Aplicar la 029 (ver `11-multi-tenant.md`) antes de sumar otra clínica.
3. **MFA en la app**: Supabase Auth trae TOTP. Falta pantalla para activarlo (QR) y pedir el
   código al entrar; exigirlo (nivel `aal2`) al menos a admin y doctor.

## Contraste con la lista "20 cosas antes de lanzar" (2026-10-10)
Comprobado en el código, no solo en la lista:
- Ya cubierto: RLS/roles/sin DELETE (4, 6, 7, 8), publishable key y service role solo en servidor
  (1, 2, 3), contraseñas en Supabase Auth (10), consultas parametrizadas por PostgREST (13),
  HTTPS/HSTS y cabeceras (18, 19), `npm audit` y CI en cada PR (20).
- **No sanitizar texto clínico**: React escapa todo y no hay `dangerouslySetInnerHTML` ni
  `innerHTML`. Sanitizar alteraría lo que escribe el doctor sin proteger más. Solo hará falta si
  algún día se muestra HTML/Markdown (p. ej. respuestas del chatbot de IA): ahí sí, sanitizar.
- Sin `select("*")` en `src/`: mantenerlo así (pedir solo las columnas que se usan).
- Archivos (16): no hay Storage aún. Cuando se suban radiografías: bucket privado con RLS,
  límite de tamaño y tipos MIME permitidos.
- Rate limiting (11, 12): Supabase Auth ya limita intentos de login. Cloudflare/WAF solo
  cuando haya varias clínicas; no es prioridad.
- Falta de verdad: MFA en la app, CSP completa (opcional). Respaldo: activo y verificado (2026-10-10).
