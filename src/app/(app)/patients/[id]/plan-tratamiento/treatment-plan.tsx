"use client";

import { useActionState } from "react";
import { SURFACES, SURFACE_LABELS } from "@/lib/odontogram";
import {
  COMMON_PROCEDURES,
  TREATMENT_STATUS_LABELS,
  formatPesos,
  treatmentTotals,
  type TreatmentStatus,
} from "@/lib/treatment-plan";
import type { PlanFormState } from "./actions";

export type PlanItem = {
  id: string;
  tooth: number | null;
  surfaces: string[] | null;
  procedure: string;
  estimated_cost: number | string | null;
  note: string | null;
  status: TreatmentStatus;
  cancel_reason: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  creator: { full_name: string } | null;
  completer: { full_name: string } | null;
};

type AddAction = (prev: PlanFormState, formData: FormData) => Promise<PlanFormState>;
type MoveAction = (
  patientId: string,
  itemId: string,
  status: Exclude<TreatmentStatus, "pendiente">,
  prev: PlanFormState,
  formData: FormData
) => Promise<PlanFormState>;

const STATUS_STYLE: Record<TreatmentStatus, string> = {
  pendiente: "border-slate-300 bg-white text-slate-700",
  en_proceso: "border-[#95D3FA] bg-[#95D3FA]/25 text-[#0766B5]",
  completado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelado: "border-slate-200 bg-slate-100 text-slate-500",
};

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function Message({ state }: { state: PlanFormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

function AddForm({ action }: { action: AddAction }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form key={state?.savedAt ?? "new"} action={formAction} className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="plan.procedure">Procedimiento</span>
        <input name="procedure" required minLength={2} maxLength={200} list="common-procedures" autoComplete="off" className="glass-input text-[15px]" />
        <datalist id="common-procedures">
          {COMMON_PROCEDURES.map((procedure) => (
            <option key={procedure} value={procedure} />
          ))}
        </datalist>
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="plan.tooth">Diente (opcional)</span>
        <input name="tooth" inputMode="numeric" pattern="[1-8][1-8]" placeholder="Ej.: 36" className="glass-input text-[15px]" />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="plan.cost">Costo estimado (RD$)</span>
        <input name="estimated_cost" inputMode="decimal" placeholder="Ej.: 3,500" className="glass-input text-[15px]" />
      </label>

      <fieldset className="md:col-span-3">
        <legend className="mb-1.5 text-sm font-medium text-slate-700" data-i18n="plan.surfaces">Superficies (opcional)</legend>
        <div className="flex flex-wrap gap-1.5">
          {SURFACES.map((surface) => (
            <label key={surface} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3 text-sm text-slate-700">
              <input type="checkbox" name="surfaces" value={surface} className="h-4 w-4 accent-[#0766B5]" />
              <span className="font-bold text-[#0766B5]">{surface}</span>
              <span data-i18n={`odontogram.surface.${surface}`}>{SURFACE_LABELS[surface]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700 md:col-span-3">
        <span data-i18n="odontogram.note">Nota (opcional)</span>
        <textarea name="note" maxLength={500} rows={2} className="glass-input resize-none text-[15px]" />
      </label>

      <div className="flex flex-col gap-2 md:col-span-3">
        <Message state={state} />
        <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
          {pending ? "Guardando…" : <span data-i18n="plan.add">Agregar al plan</span>}
        </button>
      </div>
    </form>
  );
}

function MoveButton({
  action,
  status,
  className,
}: {
  action: (prev: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  status: "en_proceso" | "completado";
  className: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <button type="submit" disabled={pending} className={className}>
        <span data-i18n={status === "completado" ? "plan.markDone" : "plan.start"}>
          {status === "completado" ? "Marcar completado" : "Iniciar"}
        </span>
      </button>
      <Message state={state} />
    </form>
  );
}

function CancelForm({ action }: { action: (prev: PlanFormState, formData: FormData) => Promise<PlanFormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-xs font-semibold text-rose-700" data-i18n="plan.cancel">Cancelar procedimiento</summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2">
        <textarea
          name="cancel_reason"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          placeholder="Motivo, ej.: el paciente decidió no hacerlo"
          className="glass-input resize-none text-sm"
        />
        <Message state={state} />
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 self-start rounded-xl border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
        >
          <span data-i18n="plan.cancelConfirm">Confirmar cancelación</span>
        </button>
      </form>
    </details>
  );
}

export function TreatmentPlan({
  patientId,
  items,
  canWrite,
  addAction,
  moveAction,
}: {
  patientId: string;
  items: PlanItem[];
  canWrite: boolean;
  addAction: AddAction;
  moveAction: MoveAction;
}) {
  const totals = treatmentTotals(items);
  const order: TreatmentStatus[] = ["en_proceso", "pendiente", "completado", "cancelado"];
  const sorted = [...items].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { key: "plan.totalPending", label: "Por realizar", value: totals.pending },
          { key: "plan.totalDone", label: "Realizado", value: totals.done },
          { key: "plan.total", label: "Total del plan", value: totals.total },
        ].map((card) => (
          <div key={card.key} className="crystal-card min-w-0 rounded-[20px] p-4">
            <p className="text-[12px] font-black uppercase tracking-[0.08em] text-slate-500" data-i18n={card.key}>{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#0766B5]">{formatPesos(card.value)}</p>
          </div>
        ))}
      </section>

      {canWrite && (
        <section className="glass-card min-w-0 p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-bold text-[#0F172A]" data-i18n="plan.new">Agregar procedimiento</h2>
          <AddForm action={addAction} />
        </section>
      )}

      <section className="glass-card min-w-0 p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-bold text-[#0F172A]" data-i18n="plan.items">Procedimientos</h2>
        {!canWrite && (
          <p className="mb-3 text-sm text-slate-600" data-i18n="plan.readOnly">Solo el doctor puede modificar el plan de tratamiento.</p>
        )}
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500" data-i18n="plan.empty">Este paciente todavía no tiene plan de tratamiento.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((item) => {
              const open = item.status === "pendiente" || item.status === "en_proceso";
              return (
                <li key={item.id} className={`rounded-2xl border p-3 ${item.status === "cancelado" ? "border-slate-200 bg-slate-50/80" : "border-white/80 bg-white/60"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`break-words text-[15px] font-bold text-[#0F172A] ${item.status === "cancelado" ? "line-through opacity-60" : ""}`}>
                        {item.tooth ? (
                          <>
                            <span data-i18n="odontogram.tooth">Diente</span> {item.tooth}
                            {item.surfaces?.length ? ` (${item.surfaces.join(", ")})` : ""} ·{" "}
                          </>
                        ) : null}
                        {item.procedure}
                      </p>
                      {item.note && <p className="text-sm text-slate-700">{item.note}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        <span data-i18n="plan.addedOn">Agregado el</span> {formatDay(item.created_at)}
                        {item.creator?.full_name ? ` · ${item.creator.full_name}` : ""}
                        {item.completed_at && (
                          <>
                            {" · "}
                            <span data-i18n="plan.doneOn">completado el</span> {formatDay(item.completed_at)}
                          </>
                        )}
                      </p>
                      {item.status === "cancelado" && item.cancel_reason && (
                        <p className="mt-1 text-xs text-slate-600">
                          <span data-i18n="plan.reason">Motivo:</span> {item.cancel_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[item.status]}`} data-i18n={`plan.status.${item.status}`}>
                        {TREATMENT_STATUS_LABELS[item.status]}
                      </span>
                      <span className="text-sm font-bold text-[#0766B5]">
                        {item.estimated_cost !== null ? formatPesos(Number(item.estimated_cost)) : "—"}
                      </span>
                    </div>
                  </div>

                  {canWrite && open && (
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      {item.status === "pendiente" && (
                        <MoveButton
                          action={moveAction.bind(null, patientId, item.id, "en_proceso")}
                          status="en_proceso"
                          className="min-h-10 rounded-xl border border-[#0766B5]/30 bg-white/70 px-3 text-sm font-semibold text-[#0766B5] transition hover:bg-white disabled:opacity-60"
                        />
                      )}
                      <MoveButton
                        action={moveAction.bind(null, patientId, item.id, "completado")}
                        status="completado"
                        className="glass-button min-h-10 px-3 text-sm font-semibold disabled:opacity-60"
                      />
                      <CancelForm action={moveAction.bind(null, patientId, item.id, "cancelado")} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
