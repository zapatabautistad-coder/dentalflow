"use client";

import { useActionState } from "react";
import {
  AI_CONSENT_SCOPE_LABELS,
  AI_CONSENT_SCOPES,
  AI_CONSENT_TEXT,
  CURRENT_AI_CONSENT_VERSION,
  MAX_AI_CONSENT_NOTE,
  aiConsentStatus,
  type AiConsentEntry,
  type AiConsentScope,
  type AiConsentStatus,
} from "@/lib/ai-consent";
import { formatHour, formatShortDate, splitLocalDateTime } from "@/lib/timezone";
import type { AiConsentFormState } from "../actions";

export type PatientAiConsentEntry = AiConsentEntry & {
  note: string | null;
  consent_version: string;
  recorded_role: string | null;
  profiles: { full_name: string } | null;
};

type Action = (prev: AiConsentFormState, formData: FormData) => Promise<AiConsentFormState>;

const STATUS_META: Record<AiConsentStatus, { label: string; key: string; className: string }> = {
  aceptado: {
    label: "Aceptado",
    key: "aiConsent.status.granted",
    className: "border-[#95D3FA] bg-[#95D3FA]/20 text-[#0766B5]",
  },
  rechazado: {
    label: "Rechazado o retirado",
    key: "aiConsent.status.refused",
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  sin_registro: {
    label: "Sin registrar",
    key: "aiConsent.status.none",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
};

const ERROR_TEXT: Record<string, string> = {
  "aiConsent.error.archived": "El paciente está archivado.",
  "aiConsent.error.noteLong": "La nota no puede pasar de 500 caracteres.",
};

function ConsentForm({ scope, action }: { scope: AiConsentScope; action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const saved = state && "saved" in state;

  return (
    <form key={saved ? state.at : "ai-consent-form"} action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="scope" value={scope} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="aiConsent.note">Nota (opcional; por ejemplo, &quot;firmó el formulario en papel&quot;)</span>
        <input name="note" maxLength={MAX_AI_CONSENT_NOTE} className="glass-input text-[15px]" />
      </label>

      {state && "errorKey" in state && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-i18n={state.errorKey}>
          {ERROR_TEXT[state.errorKey] ?? "No se pudo guardar el consentimiento. Recarga la página e inténtalo de nuevo."}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-xl border border-[#95D3FA] bg-[#95D3FA]/15 px-3 py-2 text-sm font-medium text-[#0766B5]" data-i18n="aiConsent.saved">
          Decisión registrada.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" name="granted" value="true" disabled={pending} className="glass-button min-h-11 text-[15px]" data-i18n="aiConsent.grant">
          El paciente acepta
        </button>
        <button type="submit" name="granted" value="false" disabled={pending} className="glass-button-light min-h-11 text-[15px]" data-i18n="aiConsent.refuse">
          El paciente no acepta o lo retira
        </button>
      </div>
    </form>
  );
}

function recordedBy(entry: PatientAiConsentEntry) {
  const roleLabel =
    entry.recorded_role === "doctor"
      ? "Doctor"
      : entry.recorded_role === "enfermeria"
        ? "Asistente dental"
        : entry.recorded_role === "recepcion"
          ? "Recepción"
          : entry.recorded_role === "admin"
            ? "Admin"
            : null;
  return (
    <>
      {entry.profiles?.full_name ?? "Usuario desconocido"}
      {roleLabel && <> · <span data-i18n={`role.${entry.recorded_role}`}>{roleLabel}</span></>}
    </>
  );
}

export function AiConsentRecord({
  entries,
  canWrite,
  action,
}: {
  entries: PatientAiConsentEntry[];
  canWrite: boolean;
  action: Action;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {AI_CONSENT_SCOPES.map((scope) => {
        const status = STATUS_META[aiConsentStatus(entries, scope)];
        const history = entries.filter((entry) => entry.scope === scope);

        return (
          <div key={scope} className="rounded-2xl border border-white/80 bg-white/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[#0F172A]" data-i18n={`aiConsent.scope.${scope}`}>
                {AI_CONSENT_SCOPE_LABELS[scope]}
              </h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${status.className}`} data-i18n={status.key}>
                {status.label}
              </span>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-[#0766B5]" data-i18n="aiConsent.readText">
                Texto que se le lee al paciente
              </summary>
              <p className="mt-2 text-sm text-slate-700" data-i18n={`aiConsent.text.${CURRENT_AI_CONSENT_VERSION}.${scope}`}>
                {AI_CONSENT_TEXT[CURRENT_AI_CONSENT_VERSION][scope]}
              </p>
            </details>

            {canWrite && <ConsentForm scope={scope} action={action} />}

            {history.length > 0 && (
              <ol className="mt-4 flex flex-col gap-2 border-t border-white/80 pt-3">
                {history.map((entry) => {
                  const stamp = splitLocalDateTime(entry.created_at);
                  return (
                    <li key={entry.id} className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-800" data-i18n={entry.granted ? "aiConsent.history.granted" : "aiConsent.history.refused"}>
                        {entry.granted ? "Aceptó" : "No aceptó o retiró"}
                      </span>
                      {" · "}
                      <span data-i18n-date={stamp.dateKey}>{formatShortDate(stamp.dateKey)}</span> {formatHour(entry.created_at)}
                      {" · "}
                      {recordedBy(entry)}
                      {entry.note && <span className="block text-slate-700">{entry.note}</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
