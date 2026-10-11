# Respaldo diario de la base (gratis)

`.github/workflows/respaldo-base.yml` copia cada noche (3:17 a. m. RD) la base de producción
con `pg_dump`, la **cifra con age** y la guarda 30 días como artefacto de GitHub Actions.

- El repo es **público**: la copia nunca se guarda sin cifrar. Sin llave configurada, falla.
- Solo quien tenga la **llave privada** puede abrir la copia. GitHub, Vercel o una IA no.
- Incluye: esquema `public` completo (tablas, datos, funciones, triggers, RLS, permisos),
  `auth` (usuarios; contraseñas solo como hash) y `supabase_migrations`.
- No incluye archivos de Storage (hoy no se usa).

**Estado:** activo desde el 2026-10-09; verificado el 2026-10-10 (se descargó un respaldo y la
llave privada lo abrió). Llave privada guardada en USB y en papel.

## Activarlo (una sola vez)

1. **Crear la llave** en tu computadora (no en un chat ni en una IA):
   - Instalar age: Windows `winget install FiloSottile.age` · Mac `brew install age`.
   - `age-keygen -o llave-respaldo.txt` → muestra `Public key: age1...`.
   - Guarda `llave-respaldo.txt` en un USB y en papel. **Si se pierde, los respaldos no se pueden abrir.**
     Nunca la subas al repo ni a la nube.
2. **Llave pública en GitHub**: repo → Settings → Secrets and variables → Actions →
   pestaña *Variables* → *New repository variable*: `BACKUP_AGE_RECIPIENT` = `age1...`.
3. **Conexión a la base**: Supabase → botón *Connect* → **Session pooler** (los runners de
   GitHub no tienen IPv6, la conexión directa no sirve). Copia la cadena y cambia
   `[YOUR-PASSWORD]` por la contraseña de la base. Si no la sabes: Project Settings →
   Database → *Reset database password* (la app no la usa; usa las claves de la API).
   En GitHub → Settings → **Environments** → *New environment* `respaldo` → *Deployment branches*:
   solo `main` → *Environment secrets*: `SUPABASE_DB_URL` = la cadena. No lo guardes como secreto
   del repo: así solo el respaldo, desde `main`, puede leerlo.
4. **Probar**: GitHub → Actions → *Respaldo de la base* → *Run workflow*. Debe quedar en verde
   y con un artefacto `respaldo-base`.

## Abrir y restaurar (probarlo una vez en local, nunca en producción)

```bash
# 1. Descargar el artefacto (zip) desde la ejecución en GitHub Actions y descomprimir.
age --decrypt -i llave-respaldo.txt -o respaldo.dump dentalflow-AAAA-MM-DD.dump.age

# 2. Supabase local vacío (Docker): npx supabase start
LOCAL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 3. Usuarios primero (profiles depende de auth.users), luego public y el historial.
pg_restore -d "$LOCAL" --data-only --disable-triggers --schema=auth respaldo.dump
pg_restore -d "$LOCAL" --clean --if-exists --no-owner --schema=public respaldo.dump
pg_restore -d "$LOCAL" --data-only --schema=supabase_migrations respaldo.dump
```

Si un paso falla por diferencias de versión de `auth` entre local y producción, anotar aquí el
ajuste. En un desastre real: crear un proyecto Supabase nuevo, restaurar igual y cambiar
`NEXT_PUBLIC_SUPABASE_URL` y las claves en Vercel.

## Mejora futura
Usar un rol de base solo lectura para el respaldo en vez de la contraseña de `postgres`
(requiere una migración en producción).
