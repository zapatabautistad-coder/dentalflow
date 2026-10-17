> **Regla: responder siempre en español.**

@AGENTS.md

# DentalFlow

Gestión de clínicas dentales, producto real con pacientes reales. Next.js 16 (App Router, TS) + Supabase. Detalle y porqués: `docs/DECISIONES.md`.

## Trabajo
- Respuestas breves, precisas, sin relleno. No narrar pasos: avisar solo bloqueos, decisiones o cambios de rumbo.
- Claude diseña y revisa; Copilot construye con la plantilla de `pendientes/06-prompts-para-agentes.md`. Claude no programa funciones nuevas salvo pedido directo de Darys.
- Solo Darys une PR. Nadie hace push a `main` ni activa auto-merge.
- Una tarea por sesión. Exploraciones amplias: subagente `explorador`.

## Innegociables
- Nada inventado: todo dato en pantalla sale de Supabase; sin datos, estado vacío honesto. Sin métricas, testimonios ni certificaciones falsas. Sin botones que no hagan nada.
- Nada clínico se borra (sin DELETE): paciente se archiva con motivo, cita se cancela, receta se anula con motivo.
- Todo cambio auditado (`audit_row`); autor y fecha los pone la base. `clinical_entries`, `odontogram_entries`, `vital_signs`, `prescription_items`: solo INSERT.
- Tabla nueva: RLS restrictivo por `clinic_id`, GRANT a `authenticated`, `audit_row`, bloqueo de TRUNCATE.
- Migraciones agrupadas: mientras la de turno no esté en producción, se edita, no se crea otra. Cada una con su prueba en `supabase/tests/` y su línea en `supabase/MAPA.md` (lo frenan hook y CI). Usar skill `nueva-migracion`. No ejecutar 005 ni 006.
- Consultas con columnas explícitas (nunca `select("*")`); nunca `dangerouslySetInnerHTML` con datos de Supabase o IA; errores en la URL solo como `errorKey`.
- Diseño congelado (paleta, barra lateral, ícono); teal solo para IA. Idiomas: es y en; `data-i18n` solo en texto fijo.

## Verificar y reportar
- Antes de commit: `npm run verify:fast` en verde. `npm run verify` (con build y pruebas de base) corre en la CI o con Supabase local.
- Cada tarea con criterios Dado/Cuando/Entonces; en la base, la prueba se escribe antes y se ve fallar.
- Reporte final: **Verificado** (con el comando que lo prueba) · **Inferido** · **Desconocido**. Nunca afirmar lo no ejecutado.
- Todo lo que necesite una decisión o respuesta de Darys empieza con `*DUDA*:` (una pregunta concreta por línea). Lo que no requiere nada de él no se marca.

## Dónde está cada cosa
- Esquema y estado de migraciones: `supabase/MAPA.md`, `supabase/schema.sql`.
- Reglas por módulo: `.claude/rules/` (se cargan solas; leerlas a mano al revisar un PR o escribir una migración de ese módulo).
- Módulo de referencia: recetas (`.claude/rules/recetas.md`).
- Pendientes y tareas en pausa: `pendientes/`. Incidentes: `INCIDENTES.md`. Revisar un PR: `/revisar-pr <n>`.

## Compactación
Conservar: tarea actual con rama y PR, decisiones de Darys en la sesión, archivos tocados, errores pendientes de verificación y reglas de módulo leídas. Descartar salidas ya resueltas.
