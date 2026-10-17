---
name: revisar-pr
description: Revisar un PR de DentalFlow (normalmente de Copilot) con las reglas del proyecto - seguridad, datos clínicos, migraciones y reglas de cada módulo. Usar cuando Darys pida revisar un PR, por ejemplo "/revisar-pr 52".
---

# Revisar un PR de DentalFlow

Argumento: número del PR. Responder a Darys en español, corto.

1. **Leer el PR**: título, descripción, archivos y diff con la herramienta de GitHub (`pull_request_read`). Si el diff es grande, traer la rama (`git fetch origin <rama>` y `git checkout <rama>`) y leer los archivos; así las reglas de módulo se cargan solas.
2. **Reglas de módulo**: por cada módulo que toque el PR, leer `.claude/rules/<módulo>.md`. Al revisar solo por diff no se cargan solas.
3. **Revisar** con las "Review guidelines" de `AGENTS.md`, más:
   - Migración nueva: archivo nuevo (nunca edita una existente), RLS, GRANT a `authenticated`, trigger `audit_row` si es clínica, sin DELETE, `security definer` con `set search_path`. Antes de opinar, mirar el esquema real con Supabase (solo lectura).
   - Si el PR viene de un prompt con la plantilla de `pendientes/06-prompts-para-agentes.md`: que solo toque "Archivos permitidos", cumpla las "Prohibiciones" y demuestre cada criterio Dado/Cuando/Entonces.
   - Textos en español e inglés; `data-i18n` solo en texto fijo.
   - Diseño congelado: sin cambios de paleta, barra lateral ni ícono.
   - Solo lo que pide la tarea: nada de cambios fuera de alcance.
4. **Verificar en la rama**: `npm run lint`, `npm test` y `npm run build` (la salida ya viene recortada).
5. **Actuar** según el reparto de `CLAUDE.md`: lo pequeño se corrige en el mismo PR con un commit; lo grande se comenta en el PR para que Copilot lo rehaga. Comentarios en español, solo problemas reales, con gravedad (P0 grave, P1 importante, P2 menor) y `archivo:línea`.
6. **Nunca unir** ni activar auto-merge. Terminar con un resumen para Darys: qué está bien, qué se corrigió, qué falta y si el PR queda listo para que él lo una.

Si el PR toca autenticación, RLS, roles o migraciones, correr además `/security-review`.
