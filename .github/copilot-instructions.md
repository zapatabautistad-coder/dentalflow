> **Regla: responder siempre en español, breve y paso a paso.**

Antes de escribir código, lee **`CLAUDE.md`** (fuente de verdad del proyecto) y **`AGENTS.md`**. Esta versión de Next.js tiene cambios: lee la guía relevante en `node_modules/next/dist/docs/` antes de usar una API (por ejemplo, `middleware` se llama `proxy`).

# DentalFlow

Sistema de gestión para clínicas (dentales y, más adelante, multiespecialidad). Stack: Next.js (App Router, TypeScript, Tailwind, ESLint) + Supabase. **Es un producto real** con pacientes reales, no una demo ni un portafolio.

## Reglas que nunca se rompen
- **Nunca mostrar datos inventados.** Todo número, lista o estado sale de Supabase. Sin datos: estado vacío honesto.
- **Nunca inventar** métricas, testimonios ni certificaciones (nada de "HIPAA compliant" ni similares).
- **Nada clínico se borra.** Pacientes y citas no tienen DELETE: el paciente se archiva (con motivo) y la cita se cancela. No agregar botones de borrar.
- **Registro clínico (`clinical_entries`)**: solo INSERT y SELECT. Un error se corrige con otra entrada. Nunca UPDATE/DELETE.
- **Todo cambio queda auditado** (trigger `audit_row`). Autor y fecha los ponen triggers de la base, nunca la app.
- **Nada de botones u opciones de menú que no hagan nada.** Si una función no existe, no se muestra.
- **Diseño congelado:** no cambies la barra lateral, el ícono ni la paleta sin que se pida explícitamente. Ver `CLAUDE.md`.
- Idiomas: solo español e inglés. `data-i18n` solo en textos fijos, nunca en datos de Supabase.
- **Nunca** subas secretos, claves ni el archivo `.env.local`.

## Qué NO debes hacer (lo hace el dueño del proyecto)
- Migraciones de `supabase/migrations/`, políticas RLS, triggers, permisos y `GRANT`.
- Autenticación, cuentas y roles (`/accounts`, `src/lib/auth.ts`, `src/lib/supabase/admin.ts`).
- Cualquier cambio que toque el registro clínico o la auditoría.
- Aplicar nada en la base de datos ni en producción.

## Cómo entregar
- **Trabaja siempre en una rama y abre un Pull Request. Nunca hagas push directo a `main`.** `main` se publica solo en producción (Vercel).
- **Nunca unas un PR** ni actives auto-merge, aunque la CI esté verde: solo Darys ordena unir.
- Un PR pequeño por tarea. Describe qué cambiaste y cómo lo probaste.
- Antes de decir que terminaste, ejecuta `npm run lint`, `npm test` y `npm run build`, corrige todo hasta que pasen sin errores. Luego haz commit.
- No cambies código que no tenga que ver con la tarea.

## Tareas apropiadas para Copilot
Pruebas unitarias (Vitest), traducciones ES/EN faltantes, textos y accesibilidad, mejoras de estados vacíos y de carga, documentación, limpieza de código sin cambiar comportamiento, corrección de errores pequeños y bien acotados.
