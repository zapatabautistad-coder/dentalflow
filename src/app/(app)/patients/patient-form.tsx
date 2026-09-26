"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { PatientFormState } from "./actions";

type PatientFormValues = {
  full_name: string;
  phone: string;
  email: string;
  birth_date: string;
  notes: string;
};

type PatientFormProps = {
  action: (
    prevState: PatientFormState,
    formData: FormData
  ) => Promise<PatientFormState>;
  defaultValues?: Partial<PatientFormValues>;
  submitLabel: string;
  pendingLabel: string;
};

export function PatientForm({
  action,
  defaultValues,
  submitLabel,
  pendingLabel,
}: PatientFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nombre completo
        <input
          name="full_name"
          required
          defaultValue={defaultValues?.full_name}
          placeholder="Nombre y apellidos"
          className="glass-input"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Teléfono
        <input
          name="phone"
          required
          defaultValue={defaultValues?.phone}
          placeholder="+52 55 0000 0000"
          className="glass-input"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Correo (opcional)
        <input
          name="email"
          type="email"
          defaultValue={defaultValues?.email}
          placeholder="paciente@correo.com"
          className="glass-input"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Fecha de nacimiento (opcional)
        <input
          name="birth_date"
          type="date"
          defaultValue={defaultValues?.birth_date}
          className="glass-input"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Notas (opcional)
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes}
          className="glass-input resize-none"
        />
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="mt-2 flex gap-3">
        <button type="submit" disabled={pending} className="glass-button flex-1">
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link href="/patients" className="glass-button-light flex-1 text-center">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
