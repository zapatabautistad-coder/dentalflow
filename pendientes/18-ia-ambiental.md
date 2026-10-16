# IA ambiental (harness sobre la API de Claude)

Diseño al 2026-10-16. Estado: diseño aprobado y 036 escrita; falta aplicarla, la clave de la API y el consentimiento revisado por abogado.

## Principio
"Vida propia" = agente con herramientas, memoria y mapa del dominio dentro de un harness. No escribe datos clínicos por su cuenta: **la IA propone, el doctor firma**. Toda lectura y escritura pasa por RLS y triggers como el usuario logueado.

## Capas
1. **Mapa del dominio (prompt de sistema compilado).** Script `npm run ia:mapa` genera `src/lib/ia/mapa.generated.md` desde `supabase/MAPA.md`, `.claude/rules/*`, roles, vocabulario FDI (dientes 11–48, 51–85), superficies M/D/O/V/L, condiciones del odontograma, reglas clínicas (solo INSERT, correcciones, recetas solo doctor). CI falla si está desactualizado (igual que `schema.sql`). Va primero y fijo → caché de prompt.
2. **Contexto del paciente** (por sesión, después del prefijo fijo): resumen, alergias y antecedentes, odontograma vigente, plan, últimos signos vitales, consulta abierta. Lo arma el servidor con columnas explícitas.
3. **Herramientas** (`strict: true`, `tool_choice: auto`; esquemas Zod + `betaZodTool`):
   - Lectura: `leer_paciente`, `leer_odontograma`, `leer_historial`, `leer_signos`, `leer_plan`, `leer_recetas`.
   - Borrador: `proponer_hallazgo_odontograma`, `proponer_nota`, `proponer_signos`, `proponer_item_plan`, `preguntar_al_doctor`. Escriben solo en `ai_drafts`.
   - Ninguna herramienta toca tablas clínicas. Recetas: la IA no propone medicamentos (fase 1).
4. **Validación determinista** antes de mostrar: `src/lib/dictation.ts` (diente, superficie, condición); lo dudoso → pregunta al doctor.
5. **Confirmación:** el doctor acepta/edita/rechaza cada borrador → INSERT normal en la tabla clínica con `encounter_id` y `source = 'ia_confirmada'`; el borrador queda `aceptado`/`rechazado` con enlace al registro.

## Flujo de dictado
Micrófono (Web Speech API `es-DO`/`en-US`) → texto en el navegador → server action → Claude con herramientas → borradores → validación → tarjetas teal en la consulta abierta → firma del doctor. El audio no se guarda ni sale del navegador (fase 1).

## API (servidor únicamente)
- `@anthropic-ai/sdk` en server actions / route handlers. `ANTHROPIC_API_KEY` solo en Vercel; nunca `NEXT_PUBLIC_`.
- Modelo: `claude-opus-5-5`, `thinking: {type: "adaptive"}`, `effort` medio (bajo para dictado corto), streaming + `finalMessage()`, `eager_input_streaming` en herramientas, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`).
- `claude-haiku-5-5` para clasificar/limpiar transcripción barata.
- Revisar `stop_reason` (`refusal`, `max_tokens`) antes de ejecutar herramientas.
- Sesiones largas: compaction (beta `compact-2026-01-12`).
- Límite por clínica (consultas/día y tokens/mes) en la base; corte duro al pasarlo.

## Migración 036 (escrita: `supabase/migrations/036_ia_ambiental.sql`, pruebas `05-ia.sql`; pendiente de aplicar)
- `ai_consents`: paciente, alcance (`dictado`, `procesamiento_ia`), otorgado/revocado (revocar = fila nueva), autor y fecha por trigger. Sin consentimiento vigente la IA no corre para ese paciente (Ley 172-13 [CONFIRMAR con abogado]).
- `ai_sessions`: consulta, usuario, modelo, tokens entrada/salida/caché, costo estimado, inicio/fin. Solo INSERT + cierre.
- `ai_drafts`: sesión, `encounter_id`, paciente, tipo, `payload jsonb` validado, estado (`propuesto`/`aceptado`/`rechazado`), `accepted_record_id`, decidido por/fecha (trigger). Sin DELETE; solo cambia el estado una vez.
- Columna `source` (`manual`/`ia_confirmada`, default `manual`) en `clinical_entries`, `odontogram_entries`, `vital_signs`.
- Todas: RLS por clínica y rol (doctor/enfermeria), `audit_row`, `block_truncate`, GRANT a `authenticated`, pruebas `05-ia.sql`.
- No se guarda texto del prompt completo ni respuestas crudas con datos del paciente fuera de `ai_drafts`.

## Calidad
- Evals antes de producción: 50+ dictados reales anonimizados (es/en, jerga dominicana) con resultado esperado; métrica: hallazgos correctos, cero dientes inventados, preguntas cuando hay duda.
- Registro de cada sesión en `ai_sessions` para medir costo y aceptación (% borradores aceptados).

## Costo (estimado, a medir)
Consulta típica: ~15k tokens de entrada (mayoría en caché) + ~2k de salida en Opus ≈ US$0.05–0.10. 20 consultas/día ≈ US$1–2/día por clínica. [CONFIRMAR con evals]

## Pendiente (Darys)
1. OK al diseño y a la migración 036.
2. Crear cuenta y `ANTHROPIC_API_KEY` en console.anthropic.com; cargarla en Vercel (Claude no la ve).
3. Texto de consentimiento revisado por abogado.

## Después
Claude: migración 036 + pruebas + `mapa.generated` + núcleo del harness (`src/lib/ia/`). Copilot: pantallas (botón de dictado, tarjetas teal de borradores, consentimiento) con prompt C7 en `06-prompts-para-agentes.md`.
