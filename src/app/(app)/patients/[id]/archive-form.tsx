"use client";

import { useActionState } from "react";
import type { ArchiveState } from "../actions";

export function ArchiveForm({
  action,
}: {
  action: (prev: ArchiveState, formData: FormData) => Promise<ArchiveState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white/50 p-4">
      <summary className="cursor-pointer text-[15px] font-semibold text-slate-700">Archivar paciente</summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-slate-600">
          El paciente deja de aparecer en listas y búsquedas, pero su historial, citas y cambios se conservan.
          Solo un administrador puede restaurarlo.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Motivo (obligatorio)
          <textarea
            name="archived_reason"
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
