"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { matchingMedicationAllergy, type MedicationAllergyHistory } from "@/lib/medication-allergy";
import {
  formatPrescriptionDate,
  itemDetail,
  MAX_PRESCRIPTION_ITEMS,
  type Prescription,
} from "@/lib/prescriptions";
import type { PrescriptionFormState } from "./actions";

type FormAction = (prev: PrescriptionFormState, formData: FormData) => Promise<PrescriptionFormState>;

function Feedback({ state, saved }: { state: PrescriptionFormState; saved: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.error}
      </p>
    );
  }
  if (state?.savedAt) {
    return (
      <p role="status" className="rounded-xl border border-[#95D3FA] bg-[#95D3FA]/15 px-3 py-2 text-sm font-medium text-[#0766B5]">
        {saved}
      </p>
    );
  }
  return null;
}

let nextRowId = 1;
const newRow = () => ({ id: nextRowId++, medication: "" });

function PrescriptionForm({ action, history }: { action: FormAction; history: MedicationAllergyHistory | null }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [rows, setRows] = useState(() => [newRow()]);
  const [formKey, setFormKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<number | undefined>(undefined);

  // Tras guardar, el formulario vuelve a quedar vacío.
  if (state?.savedAt && state.savedAt !== lastSaved) {
    setLastSaved(state.savedAt);
    setRows([newRow()]);
    setFormKey((k) => k + 1);
  }

  const allergyWarnings = history
    ? rows
        .map((row) => ({ medication: row.medication.trim(), allergy: matchingMedicationAllergy(row.medication, history) }))
        .filter((w): w is { medication: string; allergy: string } => Boolean(w.medication && w.allergy))
    : [];

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li key={row.id} className="rounded-xl border border-[#0E9BF3]/20 bg-white/55 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                <span data-i18n="rx.line">Medicamento</span> {index + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                  className="min-h-9 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-white"
                  data-i18n="rx.removeLine"
                >
                  Quitar
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                <span data-i18n="rx.medication">Medicamento y concentración</span>
                <input
                  name="medication"
                  required
                  minLength={2}
                  maxLength={200}
                  value={row.medication}
                  onChange={(event) =>
                    setRows((current) => current.map((r) => (r.id === row.id ? { ...r, medication: event.target.value } : r)))
                  }
                  placeholder="Amoxicilina 500 mg"
                  className="glass-input text-[15px]"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                <span data-i18n="rx.dose">Dosis</span>
                <input name="dose" maxLength={100} placeholder="1 cápsula" className="glass-input text-[15px]" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                <span data-i18n="rx.frequency">Frecuencia</span>
                <input name="frequency" maxLength={100} placeholder="Cada 8 horas" className="glass-input text-[15px]" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                <span data-i18n="rx.duration">Duración</span>
                <input name="duration" maxLength={100} placeholder="7 días" className="glass-input text-[15px]" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                <span data-i18n="rx.quantity">Cantidad</span>
                <input name="quantity" maxLength={50} placeholder="21" className="glass-input text-[15px]" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                <span data-i18n="rx.instructions">Instrucciones (opcional)</span>
                <input name="instructions" maxLength={300} className="glass-input text-[15px]" />
              </label>
            </div>
          </li>
        ))}
      </ol>

      {rows.length < MAX_PRESCRIPTION_ITEMS && (
        <button
          type="button"
          onClick={() => setRows((current) => [...current, newRow()])}
          className="glass-button-light min-h-11 self-start px-4 text-[15px]"
          data-i18n="rx.addLine"
        >
          + Agregar medicamento
        </button>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <span data-i18n="rx.indications">Indicaciones generales (opcional)</span>
        <textarea name="indications" maxLength={1000} rows={2} className="glass-input resize-y text-[15px]" />
      </label>

      {allergyWarnings.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {allergyWarnings.map((warning) => (
            <p key={warning.medication}>
              <span data-i18n="rx.allergyWarning">Atención: el paciente tiene alergia registrada a</span> {warning.allergy}{" "}
              ({warning.medication}).
            </p>
          ))}
        </div>
      )}

      <Feedback state={state} saved="Receta guardada." />
      <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
        {pending ? <span data-i18n="rx.saving">Guardando…</span> : <span data-i18n="rx.save">Guardar receta</span>}
      </button>
    </form>
  );
}

function VoidForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white/50 p-3 print:hidden">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700" data-i18n="rx.void">Anular receta</summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          <span data-i18n="rx.voidReason">Motivo (5 a 500 caracteres)</span>
          <input name="void_reason" required minLength={5} maxLength={500} className="glass-input text-[15px]" />
        </label>
        <Feedback state={state} saved="Receta anulada." />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 self-start rounded-xl border border-rose-300 bg-rose-50 px-4 text-[15px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          data-i18n="rx.confirmVoid"
        >
          Confirmar anulación
        </button>
      </form>
    </details>
  );
}

export function Prescriptions({
  patientId,
  prescriptions,
  currentUserId,
  canWrite,
  hasExequatur,
  history,
  createAction,
  voidAction,
}: {
  patientId: string;
  prescriptions: Prescription[];
  currentUserId: string;
  canWrite: boolean;
  hasExequatur: boolean;
  history: MedicationAllergyHistory | null;
  createAction: FormAction;
  voidAction: (prescriptionId: string, prev: PrescriptionFormState, formData: FormData) => Promise<PrescriptionFormState>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {canWrite && (
        <section className="glass-card p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold text-[#0F172A]" data-i18n="rx.new">Nueva receta</h2>
          {hasExequatur ? (
            <PrescriptionForm action={createAction} history={history} />
          ) : (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-i18n="rx.noExequatur">
              Falta tu exequátur; pídele al administrador que lo registre en Cuentas.
            </p>
          )}
        </section>
      )}

      <section className="glass-card p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-bold text-[#0F172A]" data-i18n="rx.list">Recetas del paciente</h2>
        {prescriptions.length === 0 ? (
          <p className="text-[15px] text-slate-600" data-i18n="rx.empty">Este paciente no tiene recetas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {prescriptions.map((rx) => (
              <li key={rx.id} className={`rounded-xl border border-[#0E9BF3]/20 bg-white/55 p-3 ${rx.voided_at ? "opacity-75" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{formatPrescriptionDate(rx.created_at)}</p>
                    <p className="break-words text-xs text-slate-500">
                      {rx.doctor_name} · <span data-i18n="rx.exequatur">Exequátur</span> {rx.doctor_exequatur}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.voided_at && (
                      <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700" data-i18n="rx.voided">
                        Anulada
                      </span>
                    )}
                    <Link
                      href={`/patients/${patientId}/recetas/${rx.id}`}
                      className="min-h-9 rounded-lg border border-[#0766B5]/30 bg-white/60 px-3 py-1.5 text-sm font-semibold text-[#0766B5] hover:bg-white"
                      data-i18n="rx.print"
                    >
                      Imprimir
                    </Link>
                  </div>
                </div>
                <ol className={`mt-2 flex list-decimal flex-col gap-1 pl-5 text-[15px] text-slate-800 ${rx.voided_at ? "line-through" : ""}`}>
                  {[...rx.prescription_items]
                    .sort((a, b) => a.position - b.position)
                    .map((item) => (
                      <li key={item.id} className="break-words">
                        <span className="font-semibold">{item.medication}</span>
                        {itemDetail(item) && <span className="text-slate-600"> — {itemDetail(item)}</span>}
                        {item.instructions && <span className="block text-sm text-slate-600">{item.instructions}</span>}
                      </li>
                    ))}
                </ol>
                {rx.indications && <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">{rx.indications}</p>}
                {rx.voided_at && rx.void_reason && (
                  <p className="mt-2 break-words text-sm text-rose-700">
                    <span data-i18n="rx.voidReasonLabel">Motivo de anulación:</span> {rx.void_reason}
                  </p>
                )}
                {canWrite && !rx.voided_at && rx.doctor_id === currentUserId && (
                  <VoidForm action={voidAction.bind(null, rx.id)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
