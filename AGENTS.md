<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DentalFlow — instrucciones para agentes (Codex y otros)

Lee `CLAUDE.md` antes de cualquier tarea: es la fuente de verdad. Responde siempre en español.
Nunca unas un PR, actives auto-merge ni hagas push a `main`: solo Darys ordena unir.

## Review guidelines
Al revisar un PR, comenta en español y solo problemas reales. Marca como grave (P0/P1):
- Datos de pacientes visibles para quien no debe (RLS, roles, otra clínica), o consultas con `select("*")`.
- `SUPABASE_SERVICE_ROLE_KEY` o `src/lib/supabase/admin.ts` usados desde el navegador o sin comprobar admin antes.
- Secretos, claves o `.env.local` en el diff.
- Algo que borre datos clínicos (DELETE, botones de borrar) o que haga UPDATE/DELETE en `clinical_entries`, `odontogram_entries`, `vital_signs` o recetas.
- Tabla clínica nueva sin trigger `audit_row`, sin RLS o sin GRANT a `authenticated`; o con permiso DELETE.
- Autor o fecha de un registro puestos por la app en vez de por la base.
- Migración que edita una ya existente en `supabase/migrations/` (siempre va una nueva).
- `dangerouslySetInnerHTML` con datos de Supabase o de IA.
- Datos inventados en pantalla (números, listas, métricas fijas) o botones que no hacen nada.
- Errores enviados en la URL como texto libre (solo claves conocidas, `errorKey`).

No comentar: estilo que ESLint ya revisa, gustos de diseño (el diseño está congelado), ni sugerencias de refactor fuera del alcance del PR.
