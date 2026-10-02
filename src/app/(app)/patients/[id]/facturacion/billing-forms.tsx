"use client";

import { useActionState, useEffect, useState } from "react";
import type { BillingFormState } from "./actions";
import { ARS_STATUS_LABELS, PAYMENT_METHOD_LABELS, type ArsClaimStatus, type PaymentMethod } from "@/lib/billing";
import { formatPesos } from "@/lib/treatment-plan";

export type CompletedBillablePlanItem = {
  id: string;
  tooth: number | null;
  procedure: string;
  estimated_cost: number | string | null;
};

type BillingFormAction = (
  previousState: BillingFormState,
  formData: FormData
) => Promise<BillingFormState>;

type ArsAdvanceAction = () => Promise<BillingFormState>;

const BILLING_ERROR_KEYS: Record<string, string> = {
  "Solo recepción y administración pueden registrar cobros.": "billing.error.permission",
  "Escribe la descripción del cargo.": "billing.error.description",
  "El monto no es válido. Ej.: 3,500": "billing.error.chargeAmount",
  "El monto no es válido. Ej.: 1,500": "billing.error.paymentAmount",
  "La cobertura de la ARS no es válida.": "billing.error.arsCoverage",
  "La cobertura de la ARS no puede ser mayor que el monto.": "billing.error.arsCoverageTooHigh",
  "Indica la ARS que cubre el cargo.": "billing.error.arsRequired",
  "El nombre o la autorización de la ARS son demasiado largos.": "billing.error.arsTooLong",
  "Ese procedimiento del plan ya fue cobrado.": "billing.error.planItemAlreadyBilled",
  "No se pudo guardar el cargo. Inténtalo de nuevo.": "billing.error.chargeSave",
  "Selecciona la forma de pago.": "billing.error.paymentMethod",
  "La referencia o la nota son demasiado largas.": "billing.error.paymentFieldsTooLong",
  "No se pudo registrar el pago. Inténtalo de nuevo.": "billing.error.paymentSave",
  "Escribe el motivo de la anulación (mínimo 5 caracteres).": "billing.error.voidReasonShort",
  "El motivo admite hasta 500 caracteres.": "billing.error.voidReasonLong",
  "No se pudo anular el cargo. Recarga la página e inténtalo de nuevo.": "billing.error.chargeVoid",
  "No se pudo anular el pago. Recarga la página e inténtalo de nuevo.": "billing.error.paymentVoid",
  "Ese cambio de estado de la ARS no es válido.": "billing.error.arsTransition",
  "No se pudo actualizar el reclamo. Recarga la página e inténtalo de nuevo.": "billing.error.arsUpdate",
};

function useBillingTranslation(state: BillingFormState) {
  useEffect(() => {
    if (!state) return;
    const language = window.localStorage.getItem("dentalflow-language") ?? "es";
    document.dispatchEvent(new CustomEvent("dentalflow-language-change", { detail: language }));
  }, [state]);
}

export function BillingLanguageBridge() {
  useEffect(() => {
    const language = window.localStorage.getItem("dentalflow-language") ?? "es";
    document.dispatchEvent(new CustomEvent("dentalflow-language-change", { detail: language }));
  }, []);

  return null;
}

function procedureDescription(item: CompletedBillablePlanItem): string {
  return item.tooth ? `Diente ${item.tooth} · ${item.procedure}` : item.procedure;
}

function ActionFeedback({ state }: { state: BillingFormState }) {
  if (state?.error) {
    return (
      <p role="alert" data-i18n={BILLING_ERROR_KEYS[state.error]} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.error}
      </p>
    );
  }
  return null;
}

function ChargeForm({
  action,
  arsName,
  procedures,
  proceduresError,
}: {
  action: BillingFormAction;
  arsName: string;
  procedures: CompletedBillablePlanItem[];
  proceduresError: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useBillingTranslation(state);
  const [selectedPlanItemId, setSelectedPlanItemId] = useState<string | null>(null);
  const selectedPlanItem = procedures.find((item) => item.id === selectedPlanItemId) ?? null;
  const formKey = `${state?.savedAt ?? "new"}-${selectedPlanItem?.id ?? "manual"}`;

  return (
    <section className="glass-card min-w-0 rounded-2xl p-4 sm:p-5">
      <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="billing.newCharge">Nuevo cargo</h2>

      <div className="mt-3">
        <h3 className="text-sm font-semibold text-slate-700" data-i18n="billing.completedUnbilled">
          Procedimientos completados sin cobrar
        </h3>
        {proceduresError ? (
          <p role="alert" className="mt-2 text-sm text-rose-700" data-i18n="billing.planLoadError">
            No se pudieron cargar los procedimientos completados.
          </p>
        ) : procedures.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500" data-i18n="billing.noCompletedUnbilled">
            No hay procedimientos completados sin cobrar.
          </p>
        ) : (
          <ul className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            {procedures.map((item) => (
              <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/55 p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-800">{procedureDescription(item)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.estimated_cost == null ? "—" : formatPesos(Number(item.estimated_cost))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlanItemId(item.id)}
                  className="glass-button min-h-11 shrink-0 px-3 text-sm font-semibold"
                  data-i18n="billing.chargeProcedure"
                >
                  Cobrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form key={formKey} action={formAction} className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="hidden" name="treatment_plan_item_id" value={selectedPlanItem?.id ?? ""} />
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
          <span data-i18n="billing.description">Descripción</span>
          <input
            name="description"
            required
            minLength={2}
            maxLength={200}
            defaultValue={selectedPlanItem ? procedureDescription(selectedPlanItem) : ""}
            className="glass-input text-[15px]"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.amount">Monto total (RD$)</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            maxLength={30}
            defaultValue={selectedPlanItem?.estimated_cost == null ? "" : String(selectedPlanItem.estimated_cost)}
            placeholder="Ej.: 3,500"
            data-i18n-placeholder="billing.amountPlaceholder"
            className="glass-input text-[15px]"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.arsCoverage">Cobertura de la ARS (opcional)</span>
          <input name="ars_coverage" inputMode="decimal" maxLength={30} placeholder="0" className="glass-input text-[15px]" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.arsName">ARS</span>
          <input name="ars_name" maxLength={120} defaultValue={arsName} className="glass-input text-[15px]" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.arsAuthorization">Autorización de la ARS (opcional)</span>
          <input name="ars_authorization" maxLength={60} className="glass-input text-[15px]" />
        </label>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <ActionFeedback state={state} />
          {state?.savedAt && (
            <p role="status" className="text-sm font-medium text-[#0766B5]" data-i18n="billing.chargeSaved">
              Cargo guardado.
            </p>
          )}
          <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
            {pending ? <span data-i18n="billing.saving">Guardando…</span> : <span data-i18n="billing.saveCharge">Guardar cargo</span>}
          </button>
        </div>
      </form>
    </section>
  );
}

function PaymentForm({ action }: { action: BillingFormAction }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useBillingTranslation(state);
  const methods = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

  return (
    <section className="glass-card min-w-0 rounded-2xl p-4 sm:p-5">
      <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="billing.newPayment">Registrar pago</h2>
      <form key={state?.savedAt ?? "new"} action={formAction} className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.amount">Monto (RD$)</span>
          <input name="amount" required inputMode="decimal" maxLength={30} placeholder="Ej.: 1,500" data-i18n-placeholder="billing.paymentAmountPlaceholder" className="glass-input text-[15px]" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.paymentMethod">Forma de pago</span>
          <select name="method" required defaultValue="efectivo" className="glass-input text-[15px]">
            {methods.map((method) => (
              <option key={method} value={method} data-i18n={`billing.method.${method}`}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.reference">Referencia (opcional)</span>
          <input name="reference" maxLength={100} className="glass-input text-[15px]" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.note">Nota (opcional)</span>
          <input name="note" maxLength={500} className="glass-input text-[15px]" />
        </label>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <ActionFeedback state={state} />
          {state?.receiptNumber != null && (
            <p role="status" className="text-sm font-bold text-[#0766B5]">
              <span data-i18n="billing.receipt">Recibo N.°</span> {state.receiptNumber}
            </p>
          )}
          <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
            {pending ? <span data-i18n="billing.saving">Guardando…</span> : <span data-i18n="billing.savePayment">Registrar pago</span>}
          </button>
        </div>
      </form>
    </section>
  );
}

export function BillingForms({
  chargeAction,
  paymentAction,
  arsName,
  procedures,
  proceduresError = false,
}: {
  chargeAction: BillingFormAction;
  paymentAction: BillingFormAction;
  arsName: string;
  procedures: CompletedBillablePlanItem[];
  proceduresError?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <ChargeForm action={chargeAction} arsName={arsName} procedures={procedures} proceduresError={proceduresError} />
      <PaymentForm action={paymentAction} />
    </div>
  );
}

export function VoidBillingForm({
  action,
  payment = false,
}: {
  action: BillingFormAction;
  payment?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useBillingTranslation(state);
  const label = payment ? "Anular pago" : "Anular cargo";
  const labelKey = payment ? "billing.voidPayment" : "billing.voidCharge";

  return (
    <details className="mt-3 min-w-0 rounded-xl border border-rose-200 bg-rose-50/70 p-3">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-rose-700" data-i18n={labelKey}>
        {label}
      </summary>
      <form action={formAction} className="mt-2 flex min-w-0 flex-col gap-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="billing.voidReason">Motivo de la anulación</span>
          <textarea name="void_reason" required minLength={5} maxLength={500} rows={2} className="glass-input resize-y text-[15px]" />
        </label>
        <ActionFeedback state={state} />
        {state?.savedAt && (
          <p role="status" className="text-sm font-medium text-[#0766B5]" data-i18n="billing.voidSaved">
            Anulación registrada.
          </p>
        )}
        <button type="submit" disabled={pending} className="glass-button-light min-h-11 self-start px-4 text-sm font-semibold disabled:opacity-60">
          {pending ? <span data-i18n="billing.saving">Guardando…</span> : <span data-i18n="billing.confirmVoid">Confirmar anulación</span>}
        </button>
      </form>
    </details>
  );
}

export function ArsAdvanceForm({
  action,
  nextStatus,
}: {
  action: ArsAdvanceAction;
  nextStatus: ArsClaimStatus;
}) {
  const [state, formAction, pending] = useActionState(
    async (previousState: BillingFormState, formData: FormData) => {
      void previousState;
      void formData;
      return action();
    },
    undefined
  );
  useBillingTranslation(state);
  const statusKey = `billing.arsStatus.${nextStatus}`;
  const statusLabel = ARS_STATUS_LABELS[nextStatus];

  return (
    <form action={formAction} className="mt-2 flex min-w-0 flex-col items-start gap-2">
      <ActionFeedback state={state} />
      <button type="submit" disabled={pending} className="glass-button-light min-h-11 px-3 text-sm font-semibold disabled:opacity-60">
        <span data-i18n="billing.advanceClaim">Avanzar reclamo:</span>{" "}
        <span data-i18n={statusKey}>{statusLabel}</span>
      </button>
    </form>
  );
}