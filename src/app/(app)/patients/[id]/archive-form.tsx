"use client";

import { useActionState, useState } from "react";
import type { ArchiveState } from "../actions";

// Motivos frecuentes: llenan el campo y se pueden completar a mano.
const QUICK_REASONS = ["Creado por error", "Registro duplicado", "Paciente de prueba"];

export function ArchiveForm({
  action,
}: {
  action: (prev: ArchiveState, formData: FormData) => Promise<ArchiveState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [reason, setReason] = useState("");

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white/50 p-4">
      <summary className="cursor-pointer text-[15px] font-semibold text-slate-700">Archivar paciente</summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-slate-600">
          El paciente deja de aparecer en listas y búsquedas, pero su historial, citas y cambios se conservan.
          Solo un administrador puede restaurarlo.
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setReason(quick)}
              aria-pressed={reason === quick}
              className="min-h-9 rounded-full border border-slate-300 bg-white/70 px-3 text-sm font-medium text-slate-700 transition hover:border-[#0E9BF3] hover:text-[#0766B5] aria-pressed:border-[#0E9BF3] aria-pressed:bg-[#E0F2FE] aria-pressed:text-[#0766B5]"
            >
              {quick}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Motivo (obligatorio)
          <textarea
            name="archived_reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={5}
            maxLength={500}
            rows={2}
            placeholder="Ej.: registro duplicado del expediente 0012"
            className="glass-input resize-none text-[15px]"
          />
        </label>
        {state?.error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 self-start rounded-xl border border-rose-300 bg-rose-50 px-4 text-[15px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {pending ? "Archivando…" : "Confirmar archivado"}
        </button>
      </form>
    </details>
  );
}
