"use client";

import { useActionState } from "react";
import type { ClinicFormState } from "./actions";

type Props = {
  action: (prev: ClinicFormState, formData: FormData) => Promise<ClinicFormState>;
  clinic: { name: string; address: string | null; phone: string | null; taxId: string | null };
};

export function ClinicForm({ action, clinic }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
        <span data-i18n="clinic.field.name">Nombre de la clínica</span>
        <input name="name" required minLength={2} maxLength={120} defaultValue={clinic.name} className="glass-input text-[15px]" />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
        <span data-i18n="clinic.field.address">Dirección</span>
        <input name="address" maxLength={200} defaultValue={clinic.address ?? ""} className="glass-input text-[15px]" />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="clinic.field.phone">Teléfono</span>
        <input name="phone" type="tel" maxLength={30} defaultValue={clinic.phone ?? ""} className="glass-input text-[15px]" />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span data-i18n="clinic.field.taxId">RNC</span>
        <input name="tax_id" maxLength={30} defaultValue={clinic.taxId ?? ""} className="glass-input text-[15px]" />
      </label>
      <div className="flex min-w-0 flex-col gap-3 md:col-span-2">
        {state?.error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.success}
          </p>
        )}
        <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
          {pending ? "Guardando…" : <span data-i18n="clinic.save">Guardar cambios</span>}
        </button>
      </div>
    </form>
  );
}
