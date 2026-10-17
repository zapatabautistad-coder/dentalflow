---
paths:
  - "src/app/**/odontograma/**"
  - "src/lib/odontogram*"
  - "supabase/migrations/018_*"
---
# Odontograma

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Odontograma (`/patients/[id]/odontograma`, tabla `odontogram_entries`, migración 018): cada hallazgo (diente FDI, superficies M/D/O/V/L, condición) es una entrada firmada por la base; solo INSERT y SELECT, un error se anula con otra entrada (`corrects_entry_id` + motivo). Escribe solo el doctor; todos leen. El estado actual de cada diente lo calcula `src/lib/odontogram.ts` (con pruebas).
- Un hallazgo puede venir de un procedimiento realizado (`procedures_performed.odontogram_entry_id`, 038); al anular el procedimiento, la base agrega la anulación del hallazgo (si no tenía corrección).
