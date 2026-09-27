"use client";

import { useActionState, useState } from "react";
import { TIME_ZONE, formatShortDate, formatHour, splitLocalDateTime } from "@/lib/timezone";
import type { ClinicalEntryState } from "../actions";

export type ClinicalEntry = {
  id: string;
  kind: "nota" | "medicamento" | "procedimiento";
  body: string | null;
  medication_name: string | null;
  dose: string | null;
  route: string | null;
  administered_at: string | null;
  corrects_entry_id: string | null;
  correction_reason: string | null;
  created_at: string;
  author_role: string | null;
  profiles: { full_name: string } | null;
};

type Action = (prev: ClinicalEntryState, formData: FormData) => Promise<ClinicalEntryState>;

const KIND_LABELS: Record<ClinicalEntry["kind"], string> = {
  nota: "Nota de evolución",
  medicamento: "Medicamento administrado",
  procedimiento: "Procedimiento",
};

const ROLE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  enfermeria: "Enfermería",
  recepcion: "Recepción",
  admin: "Admin",
};

const ROUTES = ["Oral", "Intravenosa (IV)", "Intramuscular (IM)", "Subcutánea (SC)", "Sublingual", "Tópica", "Inhalada", "Infiltración local"];

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function author(entry: ClinicalEntry): string {
  const name = entry.profiles?.full_name ?? "Usuario desconocido";
  const role = entry.author_role ? ROLE_LABELS[entry.author_role] ?? entry.author_role : null;
  return role ? `${name} (${role})` : name;
}

function EntryForm({
  action,
  nowIso,
  original,
  onCancel,
}: {
  action: Action;
  nowIso: string;
  original?: ClinicalEntry;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [kind, setKind] = useState<ClinicalEntry["kind"]>(original?.kind ?? "nota");
  const administered = splitLocalDateTime(original?.administered_at ?? nowIso);
  const saved = state && "saved" in state;

  if (saved && original) {
    return <p role="status" className="mt-2 text-sm font-medium text-[#154360]">Corrección guardada.</p>;
  }

  return (
    <form key={saved ? state.at : "form"} action={formAction} className="flex flex-col gap-3">
      {original && <input type="hidden" name="corrects_entry_id" value={original.id} />}
      <input type="hidden" name="kind" value={kind} />

      {!original && (
        <div role="radiogroup" aria-label="Tipo de entrada" className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABELS) as ClinicalEntry["kind"][]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              onClick={() => setKind(option)}
              className={`min-h-11 rounded-xl border px-3 text-[15px] font-semibold transition ${
                kind === option
                  ? "border-[#154360] bg-[#154360] text-white"
                  : "border-white/80 bg-white/60 text-[#154360] hover:border-[#8FD3C4]"
              }`}
            >
              {KIND_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      {kind === "medicamento" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
            Medicamento
            <input name="medication_name" required maxLength={200} defaultValue={original?.medication_name ?? ""} placeholder="Ej.: Amoxicilina" className="glass-input text-[15px]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Dosis
            <input name="dose" required maxLength={100} defaultValue={original?.dose ?? ""} placeholder="Ej.: 500 mg" className="glass-input text-[15px]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Vía
            <input name="route" required maxLength={100} list="clinical-routes" defaultValue={original?.route ?? ""} placeholder="Ej.: Oral" className="glass-input text-[15px]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Fecha de administración
            <input type="date" name="administered_date" required defaultValue={administered.dateKey} className="glass-input text-[15px]" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Hora de administración
            <input type="time" name="administered_time" required defaultValue={administered.time} className="glass-input text-[15px]" />
          </label>
          <datalist id="clinical-routes">
            {ROUTES.map((route) => (
              <option key={route} value={route} />
            ))}
          </datalist>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        {kind === "medicamento" ? "Observaciones (opcional)" : kind === "procedimiento" ? "Procedimiento realizado" : "Nota"}
        <textarea
          name="body"
          required={kind !== "medicamento"}
          maxLength={4000}
          rows={kind === "medicamento" ? 2 : 4}
          defaultValue={original?.body ?? ""}
          placeholder={kind === "nota" ? "Hallazgos, diagnóstico, plan…" : kind === "procedimiento" ? "Qué se hizo, zona, material…" : "Reacciones, lote, indicaciones…"}
          className="glass-input resize-y text-[15px]"
        />
      </label>

      {original && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Motivo de la corrección (obligatorio)
          <input name="correction_reason" required minLength={5} maxLength={500} placeholder="Ej.: dosis mal escrita" className="glass-input text-[15px]" />
        </label>
      )}

      {state && "error" in state && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {saved && !original && (
        <p role="status" className="rounded-xl border border-[#8FD3C4] bg-[#8FD3C4]/15 px-3 py-2 text-sm font-medium text-[#154360]">
          Entrada guardada y firmada. Ya no se puede editar ni borrar.
        </p>
      )}

      <p className="text-sm text-slate-600">
        Al guardar, la entrada queda firmada con tu nombre y la hora del servidor, y no se puede editar ni borrar.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="glass-button min-h-11 text-[15px]">
          {pending ? "Guardando…" : original ? "Guardar corrección" : "Guardar y firmar"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="glass-button-light min-h-11 text-[15px]">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function EntryContent({ entry }: { entry: ClinicalEntry }) {
  return (
    <>
      {entry.kind === "medicamento" && (
        <p className="text-[15px] text-[#0F172A]">
          <span className="font-semibold">{entry.medication_name}</span> · {entry.dose} · {entry.route}
          {entry.administered_at && (
            <>
              {" "}· administrado {formatShortDate(splitLocalDateTime(entry.administered_at).dateKey)} {formatHour(entry.administered_at)}
            </>
          )}
        </p>
      )}
      {entry.body && <p className="whitespace-pre-line text-[15px] text-slate-800">{entry.body}</p>}
    </>
  );
}

export function ClinicalRecord({
  entries,
  canWrite,
  action,
  nowIso,
}: {
  entries: ClinicalEntry[];
  canWrite: boolean;
  action: Action;
  nowIso: string;
}) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const correctionOf = new Map(entries.filter((e) => e.corrects_entry_id).map((e) => [e.corrects_entry_id as string, e]));
  const byId = new Map(entries.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-5">
      {canWrite ? (
        <EntryForm action={action} nowIso={nowIso} />
      ) : (
        <p className="text-sm text-slate-600">Solo doctores y enfermería pueden escribir en el registro clínico.</p>
      )}

      {entries.length === 0 ? (
        <p className="text-[15px] text-slate-600">Aún no hay entradas en el registro clínico.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((entry) => {
            const correction = correctionOf.get(entry.id);
            const corrected = entry.corrects_entry_id ? byId.get(entry.corrects_entry_id) : undefined;

            return (
              <li
                key={entry.id}
                className={`rounded-2xl border p-4 ${correction ? "border-slate-200 bg-slate-50/80" : "border-white/80 bg-white/60"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#154360]/20 bg-[#154360]/5 px-2.5 py-0.5 text-sm font-semibold text-[#154360]">
                    {KIND_LABELS[entry.kind]}
                  </span>
                  {entry.corrects_entry_id && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
                      Corrección
                    </span>
                  )}
                  {correction && (
                    <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-sm font-semibold text-slate-600">
                      Corregida
                    </span>
                  )}
                </div>

                <div className={`mt-2 flex flex-col gap-1 ${correction ? "line-through decoration-slate-400 opacity-70" : ""}`}>
                  <EntryContent entry={entry} />
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  {formatStamp(entry.created_at)} · {author(entry)}
                </p>

                {entry.corrects_entry_id && (
                  <p className="mt-1 text-sm text-amber-800">
                    Corrige la entrada del {corrected ? formatStamp(corrected.created_at) : "registro anterior"} · Motivo: {entry.correction_reason}
                  </p>
                )}
                {correction && (
                  <p className="mt-1 text-sm text-slate-700">
                    Corregida el {formatStamp(correction.created_at)} por {author(correction)} · Motivo: {correction.correction_reason}
                  </p>
                )}

                {canWrite && !correction && correcting !== entry.id && (
                  <button
                    type="button"
                    onClick={() => setCorrecting(entry.id)}
                    className="mt-3 min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 text-[15px] font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    Corregir
                  </button>
                )}
                {correcting === entry.id && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3">
                    <p className="mb-2 text-sm font-semibold text-amber-800">
                      La entrada original seguirá visible, tachada, con tu corrección y el motivo.
                    </p>
                    <EntryForm action={action} nowIso={nowIso} original={entry} onCancel={() => setCorrecting(null)} />
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
