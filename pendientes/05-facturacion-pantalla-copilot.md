# Facturación: pantalla (tarea para Copilot)

**Estado:** la base (migración 020), los permisos y las acciones del servidor ya están hechos por Claude. Falta solo la pantalla.

## Reglas (no negociables)
- **No tocar:** `supabase/migrations/`, la base de datos, `src/app/(app)/patients/[id]/facturacion/actions.ts`, `src/lib/billing.ts`, `src/lib/auth.ts`.
- Nada de botones de borrar. Un cargo o pago equivocado se **anula con motivo** (acciones `voidCharge` / `voidPayment`).
- Todo número sale de Supabase. Si no hay datos, estado vacío honesto.
- Diseño: paleta azul cielo de `CLAUDE.md` (`glass-card`, `crystal-card`, `glass-button`, `glass-button-light`, `glass-input`). Verde solo para "pagado".
- Textos fijos con `data-i18n` y su traducción ES/EN en `src/app/(app)/language-bridge.tsx` (prefijo `billing.`). Nunca `data-i18n` en datos de Supabase.
- Funcionar bien en celular (sin scroll horizontal de la página).

## Qué construir
1. **`src/app/(app)/patients/[id]/facturacion/page.tsx`** (Server Component)
   - `requireProfile()`; si `!canViewBilling(profile.role)` → `redirect(`/patients/${id}`)`.
   - Cargar: paciente (`id, full_name, record_number, insurance_type, insurance_provider, affiliate_number`), cargos (`billing_charges`: `id, description, amount, ars_coverage, patient_amount, ars_name, ars_authorization, ars_status, treatment_plan_item_id, created_at, voided_at, void_reason, creator:profiles!billing_charges_created_by_fkey(full_name)`), pagos (`billing_payments`: `id, receipt_number, amount, method, reference, note, received_at, voided_at, void_reason, receiver:profiles!billing_payments_received_by_fkey(full_name)`), y procedimientos del plan **completados** (`treatment_plan_items` con `status = 'completado'`) que aún no tengan cargo (comparar con `treatment_plan_item_id` de los cargos).
   - Mostrar errores de carga con mensaje honesto.
2. **Resumen arriba** (4 tarjetas, con `patientBalance()` de `src/lib/billing.ts` y `formatPesos()` de `src/lib/treatment-plan.ts`): Cargado al paciente, Pagado, **Balance** (si es negativo: "Saldo a favor"), Pendiente de la ARS.
3. **Formulario "Nuevo cargo"** (solo si `canManageBilling`), acción `addCharge.bind(null, patientId)` con `useActionState`. Campos: `description`, `amount`, `ars_coverage` (opcional), `ars_name` (prellenar con `insurance_provider` del paciente si es ARS), `ars_authorization`, `treatment_plan_item_id` (hidden).
   - Lista de "Procedimientos completados sin cobrar" con botón **Cobrar** que prellena el formulario (descripción = diente + procedimiento, monto = `estimated_cost`, `treatment_plan_item_id`).
4. **Formulario "Registrar pago"** (solo si `canManageBilling`), acción `addPayment.bind(null, patientId)`. Campos: `amount`, `method` (efectivo, tarjeta, transferencia, cheque — usar `PAYMENT_METHOD_LABELS`), `reference`, `note`. Al guardar, mostrar "Recibo N.° {receiptNumber}" (viene en el estado).
5. **Lista de cargos**: descripción, monto, cobertura ARS, lo que paga el paciente, estado ARS (`ARS_STATUS_LABELS`), fecha y quién. Lo anulado tachado con motivo. Botones (solo `canManageBilling`): avanzar reclamo según `ARS_NEXT` con `advanceArsClaim.bind(null, patientId, chargeId, actual, siguiente)`; **Anular** con `<details>` + motivo (`voidCharge.bind(null, patientId, chargeId)`, campo `void_reason`).
6. **Lista de pagos**: recibo N.°, monto, forma de pago, referencia, fecha y quién. Anular igual que cargos (`voidPayment`).
7. **Enlace** en la ficha del paciente (`src/app/(app)/patients/[id]/page.tsx`), junto a "Plan de tratamiento": botón **Facturación** visible solo si `canViewBilling(profile.role)`.

## Entrega
- `npm run lint`, `npm test` y `npm run build` sin errores.
- Commit en una rama `copilot/facturacion` y Pull Request a `main` (no push directo a `main`). Claude lo revisa antes de publicar.
