"use client";

import { useMemo, useState } from "react";

const toothPositions = [
  { key: "18", label: "18" },
  { key: "17", label: "17" },
  { key: "16", label: "16" },
  { key: "15", label: "15" },
  { key: "14", label: "14" },
  { key: "13", label: "13" },
  { key: "12", label: "12" },
  { key: "11", label: "11" },
  { key: "21", label: "21" },
  { key: "22", label: "22" },
  { key: "23", label: "23" },
  { key: "24", label: "24" },
  { key: "25", label: "25" },
  { key: "26", label: "26" },
  { key: "27", label: "27" },
  { key: "28", label: "28" },
  { key: "48", label: "48" },
  { key: "47", label: "47" },
  { key: "46", label: "46" },
  { key: "45", label: "45" },
  { key: "44", label: "44" },
  { key: "43", label: "43" },
  { key: "42", label: "42" },
  { key: "41", label: "41" },
  { key: "31", label: "31" },
  { key: "32", label: "32" },
  { key: "33", label: "33" },
  { key: "34", label: "34" },
  { key: "35", label: "35" },
  { key: "36", label: "36" },
  { key: "37", label: "37" },
  { key: "38", label: "38" },
] as const;

const defaultStatus = {
  status: "san",
  notes: "",
  mobility: "0",
  root: "",
  crown: "",
};

type ToothRecord = {
  id?: string;
  patient_id?: string;
  data?: Record<string, string | Record<string, string>>;
  notes?: string | null;
  updated_at?: string;
};

const stateStyles: Record<string, string> = {
  san: "bg-emerald-500 text-white",
  caries: "bg-amber-500 text-white",
  obturado: "bg-blue-500 text-white",
  extraccion: "bg-rose-500 text-white",
  corona: "bg-violet-500 text-white",
};

function parseInitialData(initialValue: ToothRecord | null): Record<string, typeof defaultStatus> {
  if (!initialValue?.data || typeof initialValue.data !== "object") {
    return Object.fromEntries(toothPositions.map(({ key }) => [key, { ...defaultStatus }]));
  }

  const result: Record<string, typeof defaultStatus> = {};

  for (const tooth of toothPositions) {
    const value = initialValue.data?.[tooth.key];
    if (typeof value === "string") {
      result[tooth.key] = { ...defaultStatus, status: value };
      continue;
    }

    if (value && typeof value === "object") {
      result[tooth.key] = {
        status: typeof value.status === "string" ? value.status : defaultStatus.status,
        notes: typeof value.notes === "string" ? value.notes : "",
        mobility: typeof value.mobility === "string" ? value.mobility : defaultStatus.mobility,
        root: typeof value.root === "string" ? value.root : "",
        crown: typeof value.crown === "string" ? value.crown : "",
      };
      continue;
    }

    result[tooth.key] = { ...defaultStatus };
  }

  return result;
}

export function ToothForm({
  patientId,
  initialValue,
}: {
  patientId: string;
  initialValue: ToothRecord | null;
}) {
  const [form, setForm] = useState<Record<string, typeof defaultStatus>>(() =>
    parseInitialData(initialValue)
  );
  const [selectedTooth, setSelectedTooth] = useState<string | null>("11");

  const selected = useMemo(
    () => (selectedTooth ? form[selectedTooth] ?? { ...defaultStatus } : { ...defaultStatus }),
    [form, selectedTooth]
  );

  const updateSelected = (patch: Partial<typeof defaultStatus>) => {
    if (!selectedTooth) return;
    setForm((current) => ({
      ...current,
      [selectedTooth]: {
        ...current[selectedTooth],
        ...patch,
      },
    }));
  };

  const exportJson = JSON.stringify(
    {
      patient_id: patientId,
      updated_at: new Date().toISOString(),
      teeth: Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, { ...value }])
      ),
    },
    null,
    2
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-8">
        {toothPositions.slice(0, 8).map((tooth) => {
          const state = form[tooth.key];
          return (
            <button
              key={tooth.key}
              type="button"
              onClick={() => setSelectedTooth(tooth.key)}
              className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition ${
                selectedTooth === tooth.key
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300"
              } ${stateStyles[state.status] ?? "bg-white text-slate-700"}`}
            >
              {tooth.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-8">
        {toothPositions.slice(8, 16).map((tooth) => {
          const state = form[tooth.key];
          return (
            <button
              key={tooth.key}
              type="button"
              onClick={() => setSelectedTooth(tooth.key)}
              className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition ${
                selectedTooth === tooth.key
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300"
              } ${stateStyles[state.status] ?? "bg-white text-slate-700"}`}
            >
              {tooth.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-8">
        {toothPositions.slice(16, 24).map((tooth) => {
          const state = form[tooth.key];
          return (
            <button
              key={tooth.key}
              type="button"
              onClick={() => setSelectedTooth(tooth.key)}
              className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition ${
                selectedTooth === tooth.key
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300"
              } ${stateStyles[state.status] ?? "bg-white text-slate-700"}`}
            >
              {tooth.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-8">
        {toothPositions.slice(24).map((tooth) => {
          const state = form[tooth.key];
          return (
            <button
              key={tooth.key}
              type="button"
              onClick={() => setSelectedTooth(tooth.key)}
              className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition ${
                selectedTooth === tooth.key
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300"
              } ${stateStyles[state.status] ?? "bg-white text-slate-700"}`}
            >
              {tooth.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Pieza #{selectedTooth}</h3>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            Estado: {selected.status}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Diagnóstico
            <select
              value={selected.status}
              onChange={(event) => updateSelected({ status: event.target.value })}
              className="glass-input"
            >
              <option value="san">San / sano</option>
              <option value="caries">Caries</option>
              <option value="obturado">Obturado</option>
              <option value="extraccion">Extracción</option>
              <option value="corona">Corona / restauración</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Movilidad
            <select
              value={selected.mobility}
              onChange={(event) => updateSelected({ mobility: event.target.value })}
              className="glass-input"
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Raíz
            <input
              value={selected.root}
              onChange={(event) => updateSelected({ root: event.target.value })}
              placeholder="Ajuste radicular"
              className="glass-input"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Corona
            <input
              value={selected.crown}
              onChange={(event) => updateSelected({ crown: event.target.value })}
              placeholder="Coronación / material"
              className="glass-input"
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Observación clínica
          <textarea
            value={selected.notes}
            onChange={(event) => updateSelected({ notes: event.target.value })}
            rows={4}
            placeholder="Descripción del estado, tratamiento previo o hallazgos clínicos."
            className="glass-input resize-none"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            JSON del registro
          </h3>
          <button type="button" className="glass-button-light text-xs">
            Guardar revisión
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-200">{exportJson}</pre>
      </div>
    </div>
  );
}
