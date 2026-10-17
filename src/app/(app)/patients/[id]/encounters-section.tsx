"use client";

import { useActionState } from "react";
import type { EncounterFormState } from "./encounter-actions";

export type EncounterItem = {
  id: string;
  status: "abierta" | "cerrada";
  reason: string | null;
  closure_note: string | null;
  openedAtLabel: string;
  closedAtLabel: string | null;
  openedByName: string | null;
  closedByName: string | null;
};

export type AppointmentOption = { id: string; label: string };

type Action = (prev: EncounterFormState, formData: FormData) => Promise<EncounterFormState>;

const ERROR_FALLBACK: Record<string, string> = {
  "encounters.error.permission": "No tienes permiso para esta acción.",
  "encounters.error.reasonLong": "El motivo admite hasta 500 caracteres.",
  "encounters.error.noteLong": "La nota de cierre admite hasta 1000 caracteres.",
  "encounters.error.archived": "No se pueden abrir consultas en un paciente archivado.",
  "encounters.error.appointment": "La cita seleccionada no es de este paciente.",
  "encounters.error.appointmentTaken": "Esa cita ya tiene una consulta.",
  "encounters.error.closeFailed": "No se pudo cerrar la consulta. Recarga la página e inténtalo de nuevo.",
  "encounters.error.database": "No se pudo abrir la consulta. Recarga la página e inténtalo de nuevo.",
};

function FormError({ state }: { state: EncounterFormState }) {
  if (!state || !("errorKey" in state)) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-i18n={state.errorKey}>
      {ERROR_FALLBACK[state.errorKey] ?? ERROR_FALLBACK["encounters.error.database"]}
    </p>
  );
}

function OpenEncounterForm({
  action,
  appointments,
  defaultAppointmentId,
}: {
  action: Action;
  appointments: AppointmentOption[];
  defaultAppointmentId: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <details className="rounded-2xl border border-[#95D3FA] bg-white/60 p-4" open={Boolean(defaultAppointmentId)}>
      <summary className="cursor-pointer text-[15px] font-semibold text-[#0766B5]" data-i18n="encounters.open">
        Abrir consulta
      </summary>
      <form key={state && "saved" in state ? state.at : "form"} action={formAction} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="encounters.reason">Motivo (opcional)</span>
          <textarea name="reason" maxLength={500} rows={2} className="glass-input resize-none text-[15px]" />
        </label>
        {appointments.length > 0 && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span data-i18n="encounters.appointment">Cita (opcional)</span>
            <select name="appointment_id" defaultValue={defaultAppointmentId} className="glass-input text-[15px]">
              <option value="" data-i18n="encounters.noAppointment">Sin cita</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <FormError state={state} />
        <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] disabled:opacity-60">
          <span data-i18n={pending ? "encounters.opening" : "encounters.openSubmit"}>{pending ? "Abriendo…" : "Abrir consulta"}</span>
        </button>
      </form>
    </details>
  );
}

function CloseEncounterForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700" data-i18n="encounters.close">
        Cerrar consulta
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-slate-600" data-i18n="encounters.close.hint">
          Una consulta cerrada no admite registros nuevos ni cambios.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="encounters.closureNote">Nota de cierre (opcional)</span>
          <textarea name="closure_note" maxLength={1000} rows={2} className="glass-input resize-none text-[15px]" />
        </label>
        <FormError state={state} />
        <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] disabled:opacity-60">
          <span data-i18n={pending ? "encounters.closing" : "encounters.closeConfirm"}>{pending ? "Cerrando…" : "Confirmar cierre"}</span>
        </button>
      </form>
    </details>
  );
}

export function EncountersSection({
  encounters,
  appointments,
  defaultAppointmentId,
  canOpen,
  canClose,
  openAction,
  closeAction,
}: {
  encounters: EncounterItem[];
  appointments: AppointmentOption[];
  defaultAppointmentId: string;
  canOpen: boolean;
  canClose: boolean;
  openAction: Action;
  closeAction: (encounterId: string, prev: EncounterFormState, formData: FormData) => Promise<EncounterFormState>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {canOpen && <OpenEncounterForm action={openAction} appointments={appointments} defaultAppointmentId={defaultAppointmentId} />}
      {encounters.length === 0 ? (
        <p className="text-sm text-slate-500" data-i18n="encounters.empty">Este paciente no tiene consultas registradas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {encounters.map((encounter) => (
            <li key={encounter.id} className="rounded-xl border border-white/80 bg-white/50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-[#0F172A]">{encounter.openedAtLabel}</p>
                <span
                  className={
                    encounter.status === "abierta"
                      ? "rounded-full border border-[#95D3FA] bg-[#E0F2FE] px-2.5 py-0.5 text-xs font-semibold text-[#0766B5]"
                      : "rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                  }
                  data-i18n={encounter.status === "abierta" ? "encounters.status.open" : "encounters.status.closed"}
                >
                  {encounter.status === "abierta" ? "Abierta" : "Cerrada"}
                </span>
              </div>
              {encounter.openedByName && (
                <p className="text-sm text-slate-600">
                  <span data-i18n="encounters.openedBy">Abierta por</span> {encounter.openedByName}
                </p>
              )}
              {encounter.reason && (
                <p className="mt-1 whitespace-pre-line text-[15px] text-slate-700">
                  <span className="font-semibold" data-i18n="encounters.reasonLabel">Motivo:</span> {encounter.reason}
                </p>
              )}
              {encounter.status === "cerrada" && (
                <div className="mt-1 text-sm text-slate-600">
                  <p>
                    <span data-i18n="encounters.closedAt">Cerrada</span> {encounter.closedAtLabel}
                    {encounter.closedByName && (
                      <>
                        {" "}
                        <span data-i18n="chart.by">por</span> {encounter.closedByName}
                      </>
                    )}
                  </p>
                  {encounter.closure_note && (
                    <p className="mt-1 whitespace-pre-line text-[15px] text-slate-700">
                      <span className="font-semibold" data-i18n="encounters.closureNoteLabel">Nota de cierre:</span> {encounter.closure_note}
                    </p>
                  )}
                </div>
              )}
              {encounter.status === "abierta" && canClose && <CloseEncounterForm action={closeAction.bind(null, encounter.id)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
