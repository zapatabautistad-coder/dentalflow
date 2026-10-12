---
paths:
  - "src/app/**/facturacion/**"
  - "src/lib/billing*"
  - "supabase/migrations/020_*"
  - "supabase/migrations/021_*"
---
# Facturación

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Facturación (tablas `billing_charges` y `billing_payments`, migración 020): cargos con cobertura de ARS (`patient_amount` calculado por la base) y reclamo a la ARS (pendiente → reclamado → pagado/rechazado); pagos con recibo consecutivo de la base (`billing_receipt_seq`). Sin DELETE ni edición: se anula con motivo; auditado. Registran recepción y admin (`canManageBilling`), el doctor ve (`canViewBilling`), enfermería sin acceso. Acciones en `src/app/(app)/patients/[id]/facturacion/actions.ts`, balance en `src/lib/billing.ts`. Pantalla en `/patients/[id]/facturacion` (hecha por Copilot, PR #4). Un procedimiento del plan solo puede tener un cargo vigente (índice parcial, 021): si el cargo se anula, se puede volver a cobrar.
