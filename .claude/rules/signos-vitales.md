---
paths:
  - "src/app/**/vital-signs-record.tsx"
  - "src/lib/vital-signs*"
  - "supabase/migrations/026_*"
---
# Signos vitales

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Signos vitales (tabla `vital_signs`, migración 026): PA, pulso, glucemia y saturación, cita opcional del mismo paciente. Igual que el registro clínico: solo INSERT y SELECT, se corrige con otra entrada (`corrects_entry_id` + motivo), autor/rol/hora por la base, auditado. Registran doctor y asistente dental; todos leen. Clasificación AHA y alertas en `src/lib/vital-signs.ts` (con pruebas); `vitalSignsReasons` dice si los antecedentes (hipertensión, diabetes, cardiopatía) recomiendan tomarlos.
