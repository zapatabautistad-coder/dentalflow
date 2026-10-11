# Plan de incidentes — "si pasa X, haz Y"

DentalFlow tiene pacientes reales. Ante cualquier incidente: **primero detener el daño, después
entender, al final arreglar.** No borrar nada (ni filas, ni ramas, ni registros): todo sirve de
evidencia. Anotar cada paso con hora en la sección *Bitácora* al final.

Datos clave:
- Producción: Vercel `dentalflow-navy.vercel.app`, se publica sola con cada push a `main`.
- Base de producción: Supabase **`DENTALFLOW`** (`ytoxbvfxjbomqjjshumd`). Demo: `dentalflow-demo`.
- Respaldo nocturno cifrado: `supabase/RESPALDO.md`. Llave privada en USB y papel.
- Auditoría: tabla `audit_log` (versión anterior, nueva, quién y cuándo).

---

## 1. La app se rompió después de unir un PR
1. **Vercel → proyecto → Deployments** → el último despliegue de producción que funcionaba →
   menú `⋯` → **Instant Rollback**. En 1 minuto la app vuelve a la versión anterior.
2. Ojo: tras un rollback, Vercel **deja de publicar solo** los pushes a `main` hasta que
   vuelvas a promover un despliegue. Es lo que queremos mientras se arregla.
3. En GitHub, abrir el PR culpable → **Revert** → se crea un PR que lo deshace. Que pase la CI.
4. Unir el revert y, en Vercel, promover ese nuevo despliegue (**Promote to Production**).
5. Si el PR traía una migración ya aplicada en la base, **no** basta el revert del código:
   pedir a Claude una migración nueva que la compense (nunca editar ni borrar la anterior).

## 2. Entró código sospechoso o malicioso a `main`
Ejemplos: un PR que nadie pidió, un agente que unió sin orden, una dependencia rara.
1. Rollback en Vercel (paso 1 de arriba) **antes de investigar**.
2. Revert del PR. Revisar en GitHub → *Insights → Network* / *Commits* qué más entró.
3. Si el código pudo leer variables de entorno (servidor, rutas `/api`, Server Actions):
   tratar las claves como filtradas → **ver 3**.
4. Revisar `audit_log` desde la hora del despliegue: cambios hechos por cuentas que no
   corresponden. Si hubo cambios malos → **ver 6**.
5. Quitar acceso al autor (colaborador, app o agente) en GitHub → *Settings → Collaborators* y
   *Settings → GitHub Apps*.

## 3. Se filtró una clave o contraseña
Señales: la pegaste en un chat, en un issue, en un commit, o GitHub avisa por *secret scanning*.

| Clave | Dónde se cambia | Después |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (salta RLS, **la más grave**) | Supabase → Project Settings → API Keys: crear una clave secreta nueva y revocar la vieja | Vercel → Settings → Environment Variables → actualizar → **Redeploy** |
| Contraseña de la base (`postgres`) | Supabase → Project Settings → Database → *Reset database password* | GitHub → Settings → Environments → `SUPABASE_DB_URL` → actualizar el secreto |
| `IDENTITY_API_KEY` | Panel del proveedor | Vercel → actualizar → Redeploy |
| Llave privada del respaldo (age) | Crear llave nueva (`supabase/RESPALDO.md`, paso 1) | Cambiar `BACKUP_AGE_RECIPIENT`. Los respaldos viejos los abre la llave vieja: borrar esos artefactos en Actions |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No es secreta (va en el navegador). La protege RLS | Nada urgente |

Si un commit tuvo una clave: rotarla igual. Borrarla del historial **no** basta (el repo es público).

## 4. Una cuenta del personal está comprometida
(Contraseña robada, celular perdido con sesión abierta, empleado despedido.)
1. Admin → **Cuentas** → desactivar con motivo. Queda bloqueado en Auth y sin acceso por RLS al instante.
2. Revisar en `audit_log` lo que hizo esa cuenta en los últimos días. Si hay cambios malos → **ver 6**.
3. Si debe volver: reactivar y que cree contraseña nueva (y MFA si es admin o doctor).
4. Si la cuenta comprometida es **el único admin**: entrar a Supabase con la cuenta de Darys y
   pedir ayuda a Claude (no hay otra vía en la app, a propósito).

## 5. La cuenta de Darys (GitHub, Vercel o Supabase) está comprometida
1. Recuperarla con los códigos de respaldo de 2FA. Cambiar contraseña y cerrar todas las sesiones.
2. Revocar tokens y apps: GitHub → *Settings → Applications* y *Developer settings → Personal
   access tokens*; Vercel → *Account → Tokens*; Supabase → *Account → Access Tokens*.
3. Revisar en GitHub los pushes y cambios de configuración (protección de `main`, colaboradores,
   secretos). Revisar en Vercel las variables de entorno y dominios.
4. Tratar todas las claves como filtradas → **ver 3**. Luego **ver 2**.

## 6. Datos dañados o cambiados por error
Nada clínico se borra (no hay DELETE), pero sí se puede actualizar mal un paciente, cargo o cita.
1. Buscar en `audit_log` la fila afectada: la columna de versión anterior tiene el valor bueno.
2. Corregir desde la app si se puede (editar paciente, anular cargo con motivo, nueva entrada
   clínica que corrige). Así la corrección también queda auditada.
3. Si son muchas filas: pedir a Claude un script que restaure desde `audit_log`, probado
   **primero en local o en el demo**, nunca directo en producción.
4. Si la base está perdida o irrecuperable: restaurar el respaldo (`supabase/RESPALDO.md`,
   sección *En un desastre real*). Se pierde lo hecho desde las 3:17 a. m. del día.

## 7. Una clínica ve datos de otra (cuando haya varias)
Es el incidente más grave posible.
1. Rollback en Vercel si empezó tras un despliegue (**ver 1**).
2. Si no se resuelve con rollback: desactivar temporalmente las cuentas de la clínica afectada
   (Cuentas) mientras Claude revisa RLS. Avisar a las clínicas que usen papel unas horas.
3. Con `audit_log` y los logs de Supabase, listar qué datos se vieron y por quién.
4. Consultar con un abogado la obligación de avisar a pacientes y clínicas (Ley 172-13 de
   protección de datos de RD). No decidirlo solos.

## 8. Supabase o Vercel están caídos
1. Mirar `status.supabase.com` y `vercel-status.com`. Si es de ellos, no hay nada que arreglar
   en el código: no tocar nada.
2. Avisar a las clínicas y que anoten en papel; al volver, se pasa a la app (queda con la hora real
   de registro, no la de la consulta: anotarlo en la nota clínica).
3. Si lleva horas: el respaldo permite levantar otro proyecto, pero solo vale la pena en un desastre.

## 9. El respaldo nocturno falló
GitHub manda un correo cuando falla *Respaldo de la base*.
1. Abrir la ejecución en Actions y leer el error. Lo más común: cambió la contraseña de la base
   (actualizar `SUPABASE_DB_URL`) o falta `BACKUP_AGE_RECIPIENT`.
2. Correrlo a mano: Actions → *Respaldo de la base* → *Run workflow*. Debe quedar en verde.
3. Dos noches seguidas sin respaldo = prioridad del día.

## 10. Un agente (Claude, Copilot, Codex, Gemini) hizo algo que no se pidió
Ejemplos: unió un PR sin orden, hizo push a `main`, tocó migraciones o la base.
1. Si llegó a producción: **ver 1**. Si tocó la base: revisar `audit_log` y **ver 6**.
2. Quitarle el permiso que usó (GitHub → *Settings → GitHub Apps*, o la protección de `main`).
3. Anotar la regla que faltó en `CLAUDE.md` (y en el archivo del agente) para que no se repita.

---

## Prevención
Activo: CI en cada PR · `CODEOWNERS` · Dependabot de seguridad · respaldo nocturno cifrado ·
auditoría de toda tabla clínica · sin DELETE · los agentes no unen PR sin orden de Darys.
Lo hace Darys (ver `pendientes/10-revision-seguridad.md`): 2FA en GitHub, Vercel y Supabase;
proteger `main` (solo por PR, CI obligatoria, "Require review from Code Owners").

## Bitácora
Anotar aquí cada incidente: fecha y hora, qué pasó, qué se hizo, qué se cambió para que no se repita.

| Fecha | Qué pasó | Qué se hizo | Prevención |
|---|---|---|---|
| — | — | — | — |
