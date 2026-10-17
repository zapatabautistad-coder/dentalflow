---
paths:
  - "src/app/**/plan-tratamiento/**"
  - "src/lib/treatment-plan*"
  - "supabase/migrations/019_*"
  - "supabase/migrations/038_*"
---
# Plan de tratamiento

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Plan de tratamiento (`/patients/[id]/plan-tratamiento`, tabla `treatment_plan_items`, migración 019): procedimientos con diente opcional y costo en RD$; estados pendiente → en_proceso → completado, o cancelado con motivo (trigger `stamp_treatment_plan_item`). Solo cambia el estado; sin DELETE y con auditoría. Escribe solo el doctor; todos leen. Lógica y totales en `src/lib/treatment-plan.ts` (con pruebas). Al marcar completado un procedimiento con diente, el doctor puede registrar el resultado en el odontograma en el mismo paso (condición sugerida por `suggestOdontogramCondition`; diente y superficies salen del procedimiento guardado).
- Procedimientos realizados (`procedures_performed`, migración 038): lo hecho en una consulta abierta, solo el doctor, con `register_procedure()` (hallazgo opcional + procedimiento + ítem del plan completado, todo o nada). Un ítem admite un solo procedimiento vigente; cancelado, ninguno; el diente debe ser el del plan (las superficies pueden cambiar). No se edita: se anula con motivo, lo que anula también su hallazgo; el ítem sigue completado y admite registrarlo de nuevo. La nota va en el procedimiento, no en `clinical_entries`.
