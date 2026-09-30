"use client";

import { useRef, useState } from "react";
import { formatDominicanDocumentId } from "@/lib/phone";
import { searchPatients, type PatientResult } from "./actions";

export function PatientPicker({
  defaultPatient,
}: {
  defaultPatient?: PatientResult | null;
}) {
  const [selected, setSelected] = useState<PatientResult | null>(defaultPatient ?? null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const found = await searchPatients(trimmed);
      setResults(found);
      setOpen(true);
    }, 300);
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/60 px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-800">{selected.full_name}</div>
          {selected.document_id && (
            <div className="text-xs text-slate-500">
              {formatDominicanDocumentId(selected.document_id)}
            </div>
          )}
        </div>
        <input type="hidden" name="patient_id" value={selected.id} />
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setTerm("");
          }}
          className="shrink-0 rounded-lg border border-white/90 bg-white/70 px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:border-[#0766B5] hover:text-[#0766B5]"
          data-i18n="patient.change"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="hidden"
        name="patient_id"
        value=""
      />
      <input
        type="search"
        value={term}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => term.trim() && setOpen(true)}
        placeholder="Buscar paciente por nombre, cédula o teléfono…"
        className="glass-input"
        autoComplete="off"
        data-i18n-placeholder="patient.search.placeholder"
      />

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-[0_12px_30px_-12px_rgba(7,102,181,0.4)] backdrop-blur-md">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500" data-i18n="patient.search.empty">Sin resultados.</p>
          ) : (
            results.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => {
                  setSelected(patient);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start px-4 py-2.5 text-left transition hover:bg-[#0766B5]/6"
              >
                <span className="text-sm font-semibold text-slate-800">{patient.full_name}</span>
                {patient.document_id && (
                  <span className="text-xs text-slate-500">
                    {formatDominicanDocumentId(patient.document_id)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
