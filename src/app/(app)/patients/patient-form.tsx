"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  formatDominicanDocumentId,
  formatDominicanPhone,
} from "@/lib/phone";
import type { PatientFormState } from "./actions";

type PatientFormValues = {
  full_name: string;
  document_id?: string;
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

function isAdultFromBirthDate(dateString?: string): boolean {
  if (!dateString) return true;

  const birthDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return true;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

export function PatientForm({
  action,
  defaultValues,
  submitLabel,
  pendingLabel,
}: PatientFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [phoneValue, setPhoneValue] = useState(
    () => formatDominicanPhone(defaultValues?.phone ?? "")
  );
  const [documentIdValue, setDocumentIdValue] = useState(
    () => formatDominicanDocumentId(defaultValues?.document_id ?? "")
  );
  const [birthDate, setBirthDate] = useState(defaultValues?.birth_date ?? "");

  useEffect(() => {
    setPhoneValue(formatDominicanPhone(defaultValues?.phone ?? ""));
  }, [defaultValues?.phone]);

  useEffect(() => {
    setDocumentIdValue(formatDominicanDocumentId(defaultValues?.document_id ?? ""));
  }, [defaultValues?.document_id]);

  useEffect(() => {
    if (defaultValues?.birth_date) {
      setBirthDate(defaultValues.birth_date);
    }
  }, [defaultValues?.birth_date]);

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setPhoneValue(formatDominicanPhone(digitsOnly));
  };

  const handleDocumentIdChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
    setDocumentIdValue(formatDominicanDocumentId(digitsOnly));
  };

  const isAdult = isAdultFromBirthDate(birthDate);

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
        Cédula {isAdult ? "(obligatoria)" : "(opcional)"}
        <input
          name="document_id"
          value={documentIdValue}
          onChange={(event) => handleDocumentIdChange(event.target.value)}
          placeholder="001-2345678-9"
          inputMode="numeric"
          maxLength={13}
          className="glass-input"
        />
      </label>
      <p className="-mt-2 text-xs text-slate-500">
        {isAdult
          ? "La cédula es obligatoria para pacientes mayores de edad."
          : "La cédula es opcional para menores de edad."}
      </p>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Teléfono
        <input
          name="phone"
          required
          value={phoneValue}
          onChange={(event) => handlePhoneChange(event.target.value)}
          placeholder="809-555-1234"
          inputMode="numeric"
          maxLength={12}
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
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
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
