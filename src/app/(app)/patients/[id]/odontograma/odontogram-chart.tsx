"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CONDITION_LABELS,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  SURFACE_CONDITIONS,
  SURFACE_LABELS,
  SURFACES,
  TOOTH_CONDITIONS,
  computeOdontogram,
  isSurfaceCondition,
  type OdontogramCondition,
  type OdontogramEntry,
  type Surface,
  type ToothState,
} from "@/lib/odontogram";
import type { OdontogramFormState } from "./actions";

export type ChartEntry = OdontogramEntry & {
  author_role: string | null;
  profiles: { full_name: string } | null;
};

type AddAction = (prev: OdontogramFormState, formData: FormData) => Promise<OdontogramFormState>;
type VoidAction = (
  patientId: string,
  entryId: string,
  tooth: number,
  prev: OdontogramFormState,
  formData: FormData
) => Promise<OdontogramFormState>;

const SURFACE_FILL: Record<string, string> = {
  caries: "#E11D48",
  obturacion: "#0766B5",
  sellante: "#53B6F7",
};

const ROLE_LABELS: Record<string, string> = { doctor: "Doctor", enfermeria: "Enfermería", recepcion: "Recepción", admin: "Admin" };

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

// En pantalla, el lado mesial mira hacia la línea media: a la derecha en
// los cuadrantes 1/4 (y 5/8) y a la izquierda en 2/3 (y 6/7).
function surfaceSides(tooth: number): Record<"top" | "bottom" | "left" | "right", Surface> {
  const quadrant = Math.floor(tooth / 10);
  const upper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
  const mesialRight = quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8;
  return {
    top: upper ? "V" : "L",
    bottom: upper ? "L" : "V",
    left: mesialRight ? "D" : "M",
    right: mesialRight ? "M" : "D",
  };
}

function describe(state: ToothState | undefined): string {
  if (!state || (state.whole.length === 0 && Object.keys(state.surfaces).length === 0)) return "sin hallazgos";
  const parts = state.whole.map((c) => CONDITION_LABELS[c].toLowerCase());
  for (const [surface, condition] of Object.entries(state.surfaces)) {
    parts.push(`${CONDITION_LABELS[condition].toLowerCase()} ${surface}`);
  }
  return parts.join(", ");
}

function ToothGlyph({ tooth, state }: { tooth: number; state: ToothState | undefined }) {
  const sides = surfaceSides(tooth);
  const fill = (surface: Surface) => (state?.surfaces[surface] ? SURFACE_FILL[state.surfaces[surface]!] : "#FFFFFF");
  const whole = state?.whole ?? [];
  const missing = whole.includes("ausente");

  return (
    <svg viewBox="-4 -4 48 48" className="h-full w-full" aria-hidden="true">
      <g opacity={missing ? 0.35 : 1} stroke="#0766B5" strokeWidth="1.2" strokeLinejoin="round">
        <polygon points="0,0 40,0 28,12 12,12" fill={fill(sides.top)} />
        <polygon points="0,40 40,40 28,28 12,28" fill={fill(sides.bottom)} />
        <polygon points="0,0 12,12 12,28 0,40" fill={fill(sides.left)} />
        <polygon points="40,0 28,12 28,28 40,40" fill={fill(sides.right)} />
        <rect x="12" y="12" width="16" height="16" fill={fill("O")} />
      </g>
      {whole.includes("corona") && <circle cx="20" cy="20" r="22" fill="none" stroke="#0766B5" strokeWidth="3" />}
      {whole.includes("endodoncia") && <line x1="20" y1="-3" x2="20" y2="43" stroke="#0D7FD8" strokeWidth="3" />}
      {whole.includes("implante") && (
        <rect x="-2" y="-2" width="44" height="44" rx="6" fill="none" stroke="#0766B5" strokeWidth="3" strokeDasharray="5 3" />
      )}
      {whole.includes("fractura") && (
        <polyline points="4,6 14,16 8,22 20,30 14,36" fill="none" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" />
      )}
      {(missing || whole.includes("extraccion_indicada")) && (
        <g stroke={missing ? "#475569" : "#E11D48"} strokeWidth="4" strokeLinecap="round">
          <line x1="2" y1="2" x2="38" y2="38" />
          <line x1="38" y1="2" x2="2" y2="38" />
        </g>
      )}
    </svg>
  );
}

function Arch({
  teeth,
  state,
  selected,
  onSelect,
  numbersBelow,
}: {
  teeth: number[];
  state: Map<number, ToothState>;
  selected: number | null;
  onSelect: (tooth: number) => void;
  numbersBelow: boolean;
}) {
  const half = teeth.length / 2;
  return (
    <div className="flex items-end justify-center gap-1">
      {teeth.map((tooth, index) => (
        <button
          key={tooth}
          type="button"
          onClick={() => onSelect(tooth)}
          aria-pressed={selected === tooth}
          aria-label={`Diente ${tooth}: ${describe(state.get(tooth))}`}
          className={`flex w-10 shrink-0 flex-col items-center gap-0.5 rounded-lg p-0.5 transition ${
            selected === tooth ? "bg-[#95D3FA]/50 ring-2 ring-[#0766B5]" : "hover:bg-white/70"
          } ${index === half ? "ml-3" : ""}`}
        >
          {!numbersBelow && <span className="text-[11px] font-bold text-[#0766B5]">{tooth}</span>}
          <span className="block h-9 w-9">
            <ToothGlyph tooth={tooth} state={state.get(tooth)} />
          </span>
          {numbersBelow && <span className="text-[11px] font-bold text-[#0766B5]">{tooth}</span>}
        </button>
      ))}
    </div>
  );
}

function Message({ state }: { state: OdontogramFormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

function EntryForm({ tooth, action }: { tooth: number; action: AddAction }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [condition, setCondition] = useState<OdontogramCondition>("caries");
  const surfaceMode = isSurfaceCondition(condition);

  return (
    <form key={state?.savedAt ?? "new"} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="tooth" value={tooth} />
      <input type="hidden" name="condition" value={condition} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-slate-700" data-i18n="odontogram.condition">Condición</legend>
        <div className="flex flex-wrap gap-1.5">
          {(["sano", ...SURFACE_CONDITIONS, ...TOOTH_CONDITIONS] as OdontogramCondition[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={condition === option}
              onClick={() => setCondition(option)}
              className={`min-h-10 rounded-full border px-3 text-sm font-semibold transition ${
                condition === option
                  ? "border-[#0766B5] bg-[#0766B5] text-white"
                  : "border-white/80 bg-white/60 text-[#0766B5] hover:border-[#95D3FA]"
              }`}
            >
              <span data-i18n={`odontogram.cond.${option}`}>{CONDITION_LABELS[option]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {surfaceMode && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-slate-700" data-i18n="odontogram.surfaces">Superficies</legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SURFACES.map((surface) => (
              <label key={surface} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3 text-sm text-slate-700">
                <input type="checkbox" name="surfaces" value={surface} className="h-4 w-4 accent-[#0766B5]" />
                <span className="font-bold text-[#0766B5]">{surface}</span>
                <span data-i18n={`odontogram.surface.${surface}`}>{SURFACE_LABELS[surface]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="odontogram.note">Nota (opcional)</span>
        <textarea name="note" maxLength={500} rows={2} className="glass-input resize-none text-[15px]" />
      </label>

      <Message state={state} />
      <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
        {pending ? "Guardando…" : <span data-i18n="odontogram.save">Registrar hallazgo</span>}
      </button>
    </form>
  );
}

function VoidForm({ action }: { action: AddAction }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-rose-700" data-i18n="odontogram.void">Anular (registrado por error)</summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2">
        <textarea
          name="correction_reason"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          placeholder="Motivo, ej.: era otro diente"
          className="glass-input resize-none text-sm"
        />
        <Message state={state} />
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 self-start rounded-xl border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {pending ? "Anulando…" : <span data-i18n="odontogram.voidConfirm">Confirmar anulación</span>}
        </button>
      </form>
    </details>
  );
}

export function OdontogramChart({
  patientId,
  entries,
  canWrite,
  addAction,
  voidAction,
}: {
  patientId: string;
  entries: ChartEntry[];
  canWrite: boolean;
  addAction: AddAction;
  voidAction: VoidAction;
}) {
  const state = useMemo(() => computeOdontogram(entries), [entries]);
  const hasPrimary = entries.some((entry) => Math.floor(entry.tooth / 10) >= 5);
  const [showPrimary, setShowPrimary] = useState(hasPrimary);
  const [selected, setSelected] = useState<number | null>(null);

  const voidedBy = useMemo(() => {
    const map = new Map<string, ChartEntry>();
    for (const entry of entries) if (entry.corrects_entry_id) map.set(entry.corrects_entry_id, entry);
    return map;
  }, [entries]);

  const toothHistory = selected === null
    ? []
    : entries.filter((entry) => entry.tooth === selected && entry.condition !== null).slice().reverse();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="glass-card min-w-0 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600" data-i18n="odontogram.hint">Toca un diente para ver su historial.</p>
          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0766B5]">
            <input
              type="checkbox"
              checked={showPrimary}
              onChange={(event) => setShowPrimary(event.target.checked)}
              className="h-4 w-4 accent-[#0766B5]"
            />
            <span data-i18n="odontogram.showPrimary">Mostrar dientes temporales</span>
          </label>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max flex-col items-center gap-2 px-1">
            <Arch teeth={PERMANENT_UPPER} state={state} selected={selected} onSelect={setSelected} numbersBelow={false} />
            {showPrimary && (
              <>
                <Arch teeth={PRIMARY_UPPER} state={state} selected={selected} onSelect={setSelected} numbersBelow={false} />
                <div className="my-1 h-px w-full bg-[#95D3FA]" />
                <Arch teeth={PRIMARY_LOWER} state={state} selected={selected} onSelect={setSelected} numbersBelow />
              </>
            )}
            {!showPrimary && <div className="my-1 h-px w-full bg-[#95D3FA]" />}
            <Arch teeth={PERMANENT_LOWER} state={state} selected={selected} onSelect={setSelected} numbersBelow />
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#E11D48]" /><span data-i18n="odontogram.cond.caries">Caries</span></li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#0766B5]" /><span data-i18n="odontogram.cond.obturacion">Obturación</span></li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#53B6F7]" /><span data-i18n="odontogram.cond.sellante">Sellante</span></li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-[#0766B5]" /><span data-i18n="odontogram.cond.corona">Corona</span></li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-[#0D7FD8]" /><span data-i18n="odontogram.cond.endodoncia">Endodoncia</span></li>
          <li className="flex items-center gap-1.5"><span className="text-sm font-black leading-none text-[#E11D48]">✕</span><span data-i18n="odontogram.cond.extraccion_indicada">Extracción indicada</span></li>
          <li className="flex items-center gap-1.5"><span className="text-sm font-black leading-none text-slate-600">✕</span><span data-i18n="odontogram.cond.ausente">Ausente</span></li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-2 border-dashed border-[#0766B5]" /><span data-i18n="odontogram.cond.implante">Implante</span></li>
          <li className="flex items-center gap-1.5"><span className="text-sm font-black leading-none text-[#E11D48]">ϟ</span><span data-i18n="odontogram.cond.fractura">Fractura</span></li>
        </ul>
      </section>

      <section className="glass-card min-w-0 p-4 sm:p-5">
        {selected === null ? (
          <p className="text-sm text-slate-600" data-i18n="odontogram.pickTooth">
            Selecciona un diente en el odontograma.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                <span data-i18n="odontogram.tooth">Diente</span> {selected}
              </h2>
              <p className="text-sm text-slate-600">{describe(state.get(selected))}</p>
            </div>

            {canWrite ? (
              <EntryForm key={selected} tooth={selected} action={addAction} />
            ) : (
              <p className="rounded-xl border border-white/80 bg-white/50 px-3 py-2 text-sm text-slate-600" data-i18n="odontogram.readOnly">
                Solo el doctor puede registrar hallazgos.
              </p>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-[#0F172A]" data-i18n="odontogram.history">Historial del diente</h3>
              {toothHistory.length === 0 ? (
                <p className="text-sm text-slate-500" data-i18n="odontogram.noHistory">Sin registros para este diente.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {toothHistory.map((entry) => {
                    const voided = voidedBy.get(entry.id);
                    return (
                      <li key={entry.id} className={`rounded-xl border p-3 ${voided ? "border-slate-200 bg-slate-50/80" : "border-white/80 bg-white/60"}`}>
                        <p className={`text-sm font-semibold text-[#0F172A] ${voided ? "line-through opacity-60" : ""}`}>
                          <span data-i18n={`odontogram.cond.${entry.condition}`}>{CONDITION_LABELS[entry.condition!]}</span>
                          {entry.surfaces?.length ? ` · ${entry.surfaces.join(", ")}` : ""}
                        </p>
                        {entry.note && <p className="text-sm text-slate-700">{entry.note}</p>}
                        <p className="mt-1 text-xs text-slate-500">
                          {formatStamp(entry.created_at)} · {entry.profiles?.full_name ?? "—"}
                          {entry.author_role ? ` (${ROLE_LABELS[entry.author_role] ?? entry.author_role})` : ""}
                        </p>
                        {voided && (
                          <p className="mt-1 text-xs text-rose-700">
                            <span data-i18n="odontogram.voidedOn">Anulado</span> {formatStamp(voided.created_at)} ·{" "}
                            {voided.profiles?.full_name ?? "—"} · {voided.correction_reason}
                          </p>
                        )}
                        {canWrite && !voided && <VoidForm action={voidAction.bind(null, patientId, entry.id, entry.tooth)} />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
