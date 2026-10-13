# Supabase de DentalFlow: plan para llegar a 10/10

Diagnóstico de Claude (2026-10-13), con datos reales de producción (historial de migraciones y avisos de Supabase), no solo de los archivos.

**Nota de hoy: 7,5/10.** Seguridad y trato de datos clínicos: nivel alto (RLS, auditoría, nada se borra, MFA en la base, multi-tenant, respaldo probado). Falla el **proceso**: los cambios llegan a producción a mano y nada comprueba que repo y base coincidan.

## Hallazgos reales

1. **El historial de migraciones de producción no coincide con el repo.** `supabase_migrations.schema_migrations` no tiene 001, 002, 003 ni 031 (se aplicaron desde el SQL Editor). La 028 está registrada con otro nombre (`appointments_no_overlap`, sin número). Las versiones son fechas (`20260927214410`), no `001`…`033`. La 033 está escrita y sin aplicar.
2. **No hay tipos TypeScript de la base.** ~120 consultas sin tipos: un cambio de columna rompe en producción, no al compilar.
3. **Las reglas de la base (RLS, sin DELETE, auditoría) solo se prueban a través de la pantalla** (E2E). No hay pruebas en SQL que las recorran tabla por tabla.
4. **El CLI de Supabase no tiene versión fija** (`npx -y supabase@latest` en `e2e/setup-local.sh`): la CI puede cambiar de comportamiento sola un día cualquiera.
5. **Avisos de Supabase (security advisor):**
   - *Protección de contraseñas filtradas desactivada* → real, se activa en el panel (paso D2).
   - *Funciones SECURITY DEFINER ejecutables por usuarios* (`platform_*`, `get_my_role`, etc.) → **revisado, es intencional**: cada `platform_*` comprueba `is_platform_admin()` antes de hacer nada (030) y `anon` no puede llamarlas. No cambiar.
   - *RLS sin políticas* en `clinic_counters` y `platform_admins` → intencional: nadie las lee desde la app (acceso solo por funciones). No cambiar.
6. **Avisos de rendimiento:** 45 índices "sin usar" y 7 tablas con varias políticas permisivas. Con el tráfico actual es normal: **no borrar índices ni fusionar políticas ahora** (riesgo alto, ganancia nula). Revisar cuando haya varias clínicas con uso real.

## Plan (en orden)

| # | Tarea | Quién | Riesgo |
|---|-------|-------|--------|
| D1 | ✅ Reparar el historial de migraciones en producción (hecho 2026-10-13, verificado por Claude) | Darys (SQL Editor) | Bajo: solo agrega filas de registro, no cambia tablas |
| D2 | ⏸ Activar protección de contraseñas filtradas — en pausa hasta pasar al plan Pro (decisión de Darys, 2026-10-13) | Darys (panel) | Ninguno |
| D3 | Crear usuario de solo lectura para la verificación | Darys (SQL Editor) | Bajo |
| C3 | Tipos generados + CLI con versión fija | Copilot | Bajo |
| C4 | Pruebas de la base en SQL (pgTAP) | Copilot | Bajo (solo local) |
| C5 | Verificación automática repo ↔ producción | Copilot (después de D1 y D3) | Bajo (solo lectura) |
| D4 | Decidir entorno de prueba (staging) | Darys | — |

Prompts de C3, C4 y C5: `06-prompts-para-agentes.md`.

### D1 · Reparar el historial (Darys, SQL Editor de producción) — ✅ hecho 2026-10-13

**Hecho.** Producción tiene registradas 001–032 (sin 005/006) con su nombre de archivo; 033 sigue sin aplicar. Ojo: en el SQL Editor, comprobar siempre que el proyecto sea `DENTALFLOW` (`ytoxbvfxjbomqjjshumd`), no `dentalflow-demo`.

Primero comprueba que lo que falta de verdad está aplicado (debe devolver 4 filas con `true`):

```sql
select 'tablas 001' as que, to_regclass('public.patients') is not null as ok
union all select 'grants 002', has_table_privilege('authenticated','public.patients','select')
union all select 'no solapar 028', exists (select 1 from pg_constraint where conname like '%no_overlap%')
union all select 'mfa 031', to_regprocedure('public.mfa_satisfied()') is not null;
```

> **2026-10-13: Claude ya hizo esta comprobación en producción: las 4 dan `true`** (y la 031 sí está activa dentro de `get_my_role()`; la 033 confirmada sin aplicar). Falta solo el registro de abajo: la guardia `.claude/hooks/guardian.mjs` no deja que un agente escriba en producción, así que lo pega Darys.

Si las 4 dan `true`, registra las que faltan (no ejecuta nada de las migraciones, solo anota):

```sql
insert into supabase_migrations.schema_migrations (version, name) values
  ('20260925000001', '001_mvp'),
  ('20260925000002', '002_grants'),
  ('20260925000003', '003_doctor_status_update'),
  ('20261011000031', '031_mfa_en_la_base')
on conflict (version) do nothing;
update supabase_migrations.schema_migrations
   set name = '028_appointments_no_overlap'
 where name = 'appointments_no_overlap';
```

Si alguna da `false`, **no registres** y avísale a Claude.

**Regla nueva desde aquí:** toda migración se registra con el mismo nombre que su archivo (`NNN_nombre`). La verificación de C5 compara por nombre.

### D2 · Contraseñas filtradas (Darys, panel) — ⏸ en pausa

**En pausa (decisión de Darys, 2026-10-13):** el plan gratuito no la incluye; se activa al suscribirse a Pro. Enlace: https://supabase.com/dashboard/project/ytoxbvfxjbomqjjshumd/auth/providers

Supabase → Authentication → Sign In / Providers → Email → activar *Prevent use of leaked passwords*. Si el plan gratuito no lo permite, queda anotado para cuando se pase a Pro.

### D3 · Usuario de solo lectura (Darys, SQL Editor)

La verificación (C5) no debe usar la misma clave del respaldo. Crea un usuario que solo pueda leer el historial:

```sql
create role df_verificador login password '<una contraseña larga nueva>';
grant usage on schema supabase_migrations to df_verificador;
grant select on supabase_migrations.schema_migrations to df_verificador;
```

Guarda la cadena de conexión (con el *session pooler*, igual que `SUPABASE_DB_URL`, pero con este usuario) como secreto `SUPABASE_DB_URL_LECTURA` en GitHub → Settings → Secrets → Actions.

### D4 · Entorno de prueba (decisión de Darys)

Ya existe el proyecto `dentalflow-demo` en Supabase. Opciones: (a) usarlo como staging (aplicar ahí cada migración antes que en producción); (b) seguir solo con local + E2E. Recomendación: (a), cuando haya una segunda clínica real.

## Qué es el 10/10 (y qué no hace falta todavía)

10/10 = todo lo anterior hecho: historial igual al repo y vigilado por la CI, tipos generados, reglas de la base probadas en SQL, CLI con versión fija, contraseñas filtradas bloqueadas.

**No hace falta ahora** (se anota para no perderlo): recuperación a un punto en el tiempo (PITR, de pago), fusionar políticas RLS y limpiar índices. Se revisan cuando haya clínicas pagando.
