-- =============================================================
-- DentalFlow · Migración 021 · Volver a cobrar un procedimiento anulado
-- En la 020, un procedimiento del plan solo podía tener UN cargo en total,
-- aunque ese cargo estuviera anulado. Ahora solo puede tener un cargo
-- VIGENTE: si el cargo se anuló (por ejemplo, monto equivocado), se puede
-- registrar el cargo correcto. El anulado sigue guardado y auditado.
-- =============================================================

alter table public.billing_charges
  drop constraint billing_charges_treatment_plan_item_id_key;

create unique index billing_charges_one_active_per_plan_item
  on public.billing_charges (treatment_plan_item_id)
  where treatment_plan_item_id is not null and voided_at is null;
