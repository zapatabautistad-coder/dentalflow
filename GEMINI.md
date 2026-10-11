# Instrucciones para Gemini Code Assist

Antes de cualquier tarea, lee completos `CLAUDE.md` y `AGENTS.md` en la raíz del repositorio. `CLAUDE.md` es la fuente de verdad del proyecto; si algo de este archivo no coincide con él, manda `CLAUDE.md`.

Responde siempre en español.

## Reglas que nunca se rompen
- DentalFlow es un producto real para clínicas en República Dominicana con pacientes reales. No es una demo.
- Nunca mostrar datos inventados: todo número, lista o estado en pantalla sale de Supabase. Sin datos, estado vacío honesto.
- Nada de botones u opciones de menú que no hagan nada.
- Nada clínico se borra: no agregar botones ni código que borre pacientes, citas, historial médico ni registro clínico.
- El registro clínico (`clinical_entries`) solo se crea y se lee; los errores se corrigen con una entrada nueva con motivo.
- No tocar `supabase/migrations/` ni la base de datos: esos cambios los hace Claude Code con acceso a Supabase.
- Diseño congelado: no cambiar barra lateral, ícono, colores ni paleta salvo que se pida explícitamente.
- `data-i18n` solo en textos fijos, nunca en elementos que muestran datos (nombres, motivos, dosis).
- En móvil no debe haber desplazamiento lateral: las grids llevan `grid-cols-1` o `minmax(0, …fr)`.
- Este proyecto usa Next.js 16: antes de escribir código de Next, revisa la guía en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Cómo trabajar
1. `git pull origin main` antes de empezar.
2. Haz solo lo que pide la tarea; no rediseñes ni refactorices otras partes.
3. Al terminar: `npm run build` y `npm run lint` sin errores (corrige y repite hasta que pasen).
4. Muestra `git status` y confirma que no aparecen `.env.local` ni archivos con claves.
5. Commit con mensaje en español en una **rama nueva** y abre un Pull Request. **Nunca** `git push origin main`: `main` se publica solo en producción.
6. **Nunca unas un PR** ni actives auto-merge: solo Darys ordena unir (ver `CLAUDE.md`).

## Al revisar un Pull Request
Sigue `.gemini/styleguide.md`. Comenta en español, solo lo que sea un problema real.
