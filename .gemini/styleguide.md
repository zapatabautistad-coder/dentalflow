# Guía de revisión de DentalFlow (Gemini Code Assist)

**Escribe todos los comentarios y el resumen en español.** La fuente de verdad del proyecto es
`CLAUDE.md`. DentalFlow es un producto real para clínicas dentales en República Dominicana, con
pacientes reales. Stack: Next.js 16 (App Router, `middleware` se llama `proxy`) + Supabase.

No unas PR ni sugieras auto-merge: solo Darys ordena unir.

## Marcar como CRITICAL / HIGH
- Datos de pacientes visibles para quien no debe (RLS, roles, otra clínica), o consultas con `select("*")`.
- `SUPABASE_SERVICE_ROLE_KEY` o `src/lib/supabase/admin.ts` usados desde el navegador o sin comprobar admin antes.
- Secretos, claves o `.env.local` en el diff.
- Algo que borre datos clínicos (DELETE, botones de borrar) o que haga UPDATE/DELETE en `clinical_entries`, `odontogram_entries`, `vital_signs`, `prescriptions` o `prescription_items` (la receta solo se anula con motivo). Los errores se corrigen con otra entrada (`corrects_entry_id` + motivo).
- Tabla clínica nueva sin trigger `audit_row`, sin RLS o sin GRANT a `authenticated`; o con permiso DELETE.
- Autor o fecha de un registro puestos por la app en vez de por la base (triggers).
- Migración que edita una ya existente en `supabase/migrations/` (siempre va una nueva).
- `dangerouslySetInnerHTML` con datos de Supabase o de IA.

## Marcar como MEDIUM
- Datos inventados en pantalla (números, listas, métricas fijas) o botones/opciones que no hacen nada.
- `data-i18n` en elementos que muestran datos de Supabase (nombres, motivos, dosis).
- Errores enviados en la URL como texto libre (solo claves conocidas, `errorKey`).
- Desplazamiento lateral en móvil (grids sin `grid-cols-1` o `minmax(0, …fr)`).
- Lógica nueva en `src/lib/` sin prueba de Vitest.

## No comentar
- Estilo que ESLint ya revisa.
- Gustos de diseño: el diseño está congelado (barra lateral, ícono, paleta azul cielo; teal solo para IA).
- Refactors fuera del alcance del PR.
- No sugerir sanitizar texto clínico: React ya escapa.
