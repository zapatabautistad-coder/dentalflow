---
paths:
  - "src/app/**/plan-tratamiento/**"
  - "src/lib/treatment-plan*"
  - "supabase/migrations/019_*"
---
# Plan de tratamiento

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Plan de tratamiento (`/patients/[id]/plan-tratamiento`, tabla `treatment_plan_items`, migración 019): procedimientos con diente opcional y costo en RD$; estados pendiente → en_proceso → completado, o cancelado con motivo (trigger `stamp_treatment_plan_item`). Solo cambia el estado; sin DELETE y con auditoría. Escribe solo el doctor; todos leen. Lógica y totales en `src/lib/treatment-plan.ts` (con pruebas). Al marcar completado un procedimiento con diente, el doctor puede registrar el resultado en el odontograma en el mismo paso (condición sugerida por `suggestOdontogramCondition`; diente y superficies salen del procedimiento guardado).
