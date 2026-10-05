"use client";

import { useActionState, useState } from "react";
import {
  BLOOD_PRESSURE_LABELS,
  classifyBloodPressure,
  currentVitalSigns,
  vitalAlerts,
  type BloodPressureCategory,
  type VitalSignsEntry,
} from "@/lib/vital-signs";
import { formatHour, formatShortDate, splitLocalDateTime } from "@/lib/timezone";
import type { VitalSignsFormState } from "../actions";

export type PatientVitalSignsEntry = VitalSignsEntry & {
  note: string | null;
  correction_reason: string | null;
  author_role: string | null;
  profiles: { full_name: string } | null;
};

type Action = (prev: VitalSignsFormState, formData: FormData) => Promise<VitalSignsFormState>;

const BLOOD_PRESSURE_KEYS: Record<BloodPressureCategory, string> = {
  normal: "vitalSigns.bp.normal",
  elevada: "vitalSigns.bp.elevated",
  hta1: "vitalSigns.bp.stage1",
  hta2: "vitalSigns.bp.stage2",
  crisis: "vitalSigns.bp.crisis",
};

const ALERT_KEYS: Record<string, string> = {
  [BLOOD_PRESSURE_LABELS.hta2]: "vitalSigns.alert.bp.stage2",
  [BLOOD_PRESSURE_LABELS.crisis]: "vitalSigns.alert.bp.crisis",
  "Bradicardia (< 60 lpm)": "vitalSigns.alert.bradycardia",
  "Taquicardia (> 100 lpm)": "vitalSigns.alert.tachycardia",
  "Hipoglucemia (< 70 mg/dL)": "vitalSigns.alert.lowGlucose",
  "Saturación baja (< 90 %)": "vitalSigns.alert.lowOxygen",
};

const ERROR_FALLBACK = "vitalSigns.error.database";

function VitalSignsForm({
  action,
  original,
  onCancel,
}: {
  action: Action;
  original?: PatientVitalSignsEntry;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const submittedValues = state && "values" in state ? state.values : undefined;
  const attemptId = state && "attemptId" in state ? state.attemptId : undefined;
  const saved = state && "saved" in state;

  if (saved && original) {
    return (
      <p role="status" className="text-sm font-medium text-[#0766B5]" data-i18n="vitalSigns.correctionSaved">
        Corrección guardada.
      </p>
    );
  }

  return (
    <form key={attemptId ?? (saved ? state.at : "vital-signs-form")} action={formAction} className="flex flex-col gap-3">
      {original && <input type="hidden" name="corrects_entry_id" value={original.id} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="vitalSigns.systolic">Sistólica (mmHg)</span>
          <input type="number" name="systolic" min={60} max={260} step={1} defaultValue={submittedValues?.systolic ?? original?.systolic ?? ""} className="glass-input text-[15px]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="vitalSigns.diastolic">Diastólica (mmHg)</span>
          <input type="number" name="diastolic" min={30} max={160} step={1} defaultValue={submittedValues?.diastolic ?? original?.diastolic ?? ""} className="glass-input text-[15px]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="vitalSigns.heartRate">Pulso (lpm)</span>
          <input type="number" name="heart_rate" min={30} max={220} step={1} defaultValue={submittedValues?.heart_rate ?? original?.heart_rate ?? ""} className="glass-input text-[15px]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="vitalSigns.glucose">Glucemia (mg/dL)</span>
          <input type="number" name="glucose_mg_dl" min={20} max={600} step={1} defaultValue={submittedValues?.glucose_mg_dl ?? original?.glucose_mg_dl ?? ""} className="glass-input text-[15px]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="vitalSigns.oxygen">Saturación (%)</span>
          <input type="number" name="oxygen_saturation" min={50} max={100} step={1} defaultValue={submittedValues?.oxygen_saturation ?? original?.oxygen_saturation ?? ""} className="glass-input text-[15px]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
          <span data-i18n="vitalSigns.note">Nota (opcional)</span>
          <textarea name="note" maxLength={500} rows={2} defaultValue={submittedValues?.note ?? original?.note ?? ""} className="glass-input resize-y text-[15px]" />
        </label>
      </div>

      {original && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span data-i18n="vitalSigns.correctionReason">Motivo de la corrección (5–500 caracteres)</span>
          <input
            name="correction_reason"
            required
            minLength={5}
            maxLength={500}
            defaultValue={submittedValues?.correction_reason ?? ""}
            className="glass-input text-[15px]"
          />
        </label>
      )}

      {state && "errorKey" in state && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-i18n={state.errorKey}>
          {state.errorKey === ERROR_FALLBACK ? "No se pudieron guardar los signos vitales. Recarga la página e inténtalo de nuevo." : "Revisa los datos ingresados."}
        </p>
      )}
      {saved && !original && (
        <p role="status" className="rounded-xl border border-[#95D3FA] bg-[#95D3FA]/15 px-3 py-2 text-sm font-medium text-[#0766B5]" data-i18n="vitalSigns.saved">
          Signos vitales guardados.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="glass-button min-h-11 text-[15px]">
          <span data-i18n={pending ? "vitalSigns.saving" : original ? "vitalSigns.saveCorrection" : "vitalSigns.save"}>
            {pending ? "Guardando…" : original ? "Guardar corrección" : "Guardar signos vitales"}
          </span>
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="glass-button-light min-h-11 text-[15px]" data-i18n="vitalSigns.cancel">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function author(entry: PatientVitalSignsEntry) {
  const roleKey = entry.author_role ? `role.${entry.author_role}` : null;
  const roleLabel =
    entry.author_role === "doctor"
      ? "Doctor"
      : entry.author_role === "enfermeria"
        ? "Asistente dental"
        : entry.author_role;

  return (
    <>
      {entry.profiles?.full_name ?? "Usuario desconocido"}
      {roleLabel && <> · <span data-i18n={roleKey ?? undefined}>{roleLabel}</span></>}
    </>
  );
}

export function VitalSignsRecord({
  entries,
  canWrite,
  action,
}: {
  entries: PatientVitalSignsEntry[];
  canWrite: boolean;
  action: Action;
}) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const currentEntries = currentVitalSigns(entries);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  return (
    <div className="flex flex-col gap-5">
      {canWrite ? (
        <VitalSignsForm action={action} />
      ) : (
        <p className="text-sm text-slate-600" data-i18n="vitalSigns.onlyStaff">
          Solo doctores y asistentes dentales pueden registrar o corregir signos vitales.
        </p>
      )}

      {currentEntries.length === 0 ? (
        <p className="text-[15px] text-slate-600" data-i18n="vitalSigns.empty">Aún no hay tomas de signos vitales.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {currentEntries.map((entry) => {
            const alerts = vitalAlerts({
              systolic: entry.systolic,
              diastolic: entry.diastolic,
              heart_rate: entry.heart_rate,
              glucose_mg_dl: entry.glucose_mg_dl,
              oxygen_saturation: entry.oxygen_saturation,
            });
            const alertFields = new Set(alerts.map((alert) => alert.field));
            const pressureAlert = alerts.some((alert) => alert.field === "systolic");
            const pressureCategory =
              entry.systolic !== null && entry.diastolic !== null
                ? classifyBloodPressure(entry.systolic, entry.diastolic)
                : null;
            const correctionTarget = entry.corrects_entry_id ? byId.get(entry.corrects_entry_id) : undefined;
            const stamp = splitLocalDateTime(entry.created_at);
            const redValue = "font-semibold text-rose-700";

            return (
              <li key={entry.id} className="rounded-2xl border border-white/80 bg-white/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    <span data-i18n-date={stamp.dateKey}>{formatShortDate(stamp.dateKey)}</span>
                    {" · "}{formatHour(entry.created_at)}
                  </h3>
                  {entry.corrects_entry_id && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-800" data-i18n="vitalSigns.correction">
                      Corrección
                    </span>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                  {entry.systolic !== null && entry.diastolic !== null && (
                    <div>
                      <dt className="text-xs font-semibold text-slate-500" data-i18n="vitalSigns.pressure">Presión arterial</dt>
                      <dd className={`mt-0.5 text-base ${pressureAlert ? redValue : "font-semibold text-slate-800"}`}>
                        {entry.systolic}/{entry.diastolic} <span className="text-sm font-normal" data-i18n="vitalSigns.unit.mmHg">mmHg</span>
                      </dd>
                      {pressureCategory && (
                        <dd className={`text-xs ${pressureAlert ? "font-semibold text-rose-700" : "text-slate-500"}`} data-i18n={BLOOD_PRESSURE_KEYS[pressureCategory]}>
                          {BLOOD_PRESSURE_LABELS[pressureCategory]}
                        </dd>
                      )}
                    </div>
                  )}
                  {entry.heart_rate !== null && (
                    <div>
                      <dt className="text-xs font-semibold text-slate-500" data-i18n="vitalSigns.heartRate">Pulso (lpm)</dt>
                      <dd className={`mt-0.5 text-base ${alertFields.has("heart_rate") ? redValue : "font-semibold text-slate-800"}`}>
                        {entry.heart_rate} <span className="text-sm font-normal" data-i18n="vitalSigns.unit.bpm">lpm</span>
                      </dd>
                    </div>
                  )}
                  {entry.glucose_mg_dl !== null && (
                    <div>
                      <dt className="text-xs font-semibold text-slate-500" data-i18n="vitalSigns.glucose">Glucemia (mg/dL)</dt>
                      <dd className={`mt-0.5 text-base ${alertFields.has("glucose_mg_dl") ? redValue : "font-semibold text-slate-800"}`}>
                        {entry.glucose_mg_dl} <span className="text-sm font-normal" data-i18n="vitalSigns.unit.mgdl">mg/dL</span>
                      </dd>
                    </div>
                  )}
                  {entry.oxygen_saturation !== null && (
                    <div>
                      <dt className="text-xs font-semibold text-slate-500" data-i18n="vitalSigns.oxygen">Saturación (%)</dt>
                      <dd className={`mt-0.5 text-base ${alertFields.has("oxygen_saturation") ? redValue : "font-semibold text-slate-800"}`}>
                        {entry.oxygen_saturation}<span className="text-sm font-normal">%</span>
                      </dd>
                    </div>
                  )}
                </dl>

                {alerts.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Alertas de signos vitales">
                    {alerts.map((alert) => (
                      <li key={`${alert.field}-${alert.message}`} className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800" data-i18n={ALERT_KEYS[alert.message]}>
                        {alert.message}
                      </li>
                    ))}
                  </ul>
                )}

                {entry.note && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{entry.note}</p>}
                <p className="mt-2 text-sm text-slate-500">
                  <span data-i18n="vitalSigns.recordedBy">Registrado por</span> {author(entry)}
                </p>
                {entry.corrects_entry_id && (
                  <p className="mt-1 text-sm text-amber-800">
                    <span data-i18n="vitalSigns.corrects">Corrige una toma anterior</span>
                    {correctionTarget && (
                      <> · <span data-i18n-date={splitLocalDateTime(correctionTarget.created_at).dateKey}>{formatShortDate(splitLocalDateTime(correctionTarget.created_at).dateKey)}</span></>
                    )}
                    {entry.correction_reason && <> · <span data-i18n="vitalSigns.reason">Motivo:</span> {entry.correction_reason}</>}
                  </p>
                )}

                {canWrite && correcting !== entry.id && (
                  <button
                    type="button"
                    onClick={() => setCorrecting(entry.id)}
                    className="mt-3 min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 text-[15px] font-semibold text-amber-800 transition hover:bg-amber-100"
                    data-i18n="vitalSigns.correct"
                  >
                    Corregir
                  </button>
                )}
                {correcting === entry.id && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3">
                    <p className="mb-2 text-sm font-semibold text-amber-800" data-i18n="vitalSigns.correctionHint">
                      La toma original seguirá en el historial; la corrección quedará como una nueva entrada.
                    </p>
                    <VitalSignsForm action={action} original={entry} onCancel={() => setCorrecting(null)} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}