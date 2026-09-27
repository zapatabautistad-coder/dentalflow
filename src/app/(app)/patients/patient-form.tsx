"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
  record_number?: number | null;
  insurance_type?: "ars" | "privado" | "";
  insurance_provider?: string;
  affiliate_number?: string;
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

  const match = /^\d{4}-\d{2}-\d{2}$/.exec(dateString);
  if (!match) return true;

  const [yearString, monthString, dayString] = dateString.split("-");
  const birthYear = Number(yearString);
  const birthMonth = Number(monthString);
  const birthDay = Number(dayString);

  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  if (Number.isNaN(birthDate.getTime())) return true;

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  let age = todayUtc.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = todayUtc.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = todayUtc.getUTCDate() - birthDate.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
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
  const [insuranceType, setInsuranceType] = useState(
    defaultValues?.insurance_type ?? ""
  );

  // La inicialización del estado debe ser estable entre render y hidratación.
  // Si se cambia de paciente en la misma instancia, se puede forzar un remount
  // con una key externa en la página, pero no se debe re-sincronizar el estado
  // durante el render ni dentro de un efecto.

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
    <form action={formAction} className="flex flex-col gap-2">
      {defaultValues?.record_number != null && (
        <p className="text-sm font-medium text-slate-600">
          Expediente N.° {String(defaultValues.record_number).padStart(4, "0")}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[1.3fr_0.9fr]">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700" data-i18n="patient.form.fullName">
          Nombre completo
          <input
            name="full_name"
            required
            defaultValue={defaultValues?.full_name}
            placeholder="Nombre y apellidos"
            className="glass-input h-8 px-2.5 py-1.5 text-sm"
            data-i18n-placeholder="patient.form.fullNamePlaceholder"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700" data-i18n="patient.form.documentLabel">
          Cédula {isAdult ? "(obligatoria)" : "(opcional)"}
          <input
            name="document_id"
            value={documentIdValue}
            onChange={(event) => handleDocumentIdChange(event.target.value)}
            placeholder="001-2345678-9"
            inputMode="numeric"
            maxLength={13}
            className="glass-input h-8 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
          Teléfono
          <input
            name="phone"
            required
            value={phoneValue}
            onChange={(event) => handlePhoneChange(event.target.value)}
            placeholder="809-555-1234"
            inputMode="numeric"
            maxLength={12}
            className="glass-input h-8 px-2.5 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
          Fecha de nacimiento
          <input
            name="birth_date"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="glass-input h-8 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
          Correo (opcional)
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email}
            placeholder="paciente@correo.com"
            className="glass-input h-8 px-2.5 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
          Aseguradora
          <select
            name="insurance_type"
            value={insuranceType}
            onChange={(event) =>
              setInsuranceType(event.target.value as "ars" | "privado" | "")
            }
            className="glass-input h-8 px-2.5 py-1.5 text-sm"
          >
            <option value="">Sin especificar</option>
            <option value="ars">ARS</option>
            <option value="privado">Privado</option>
          </select>
        </label>
      </div>

      {insuranceType === "ars" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
            Nombre de la ARS
            <input
              name="insurance_provider"
              required
              defaultValue={defaultValues?.insurance_provider}
              placeholder="ARS Humano"
              className="glass-input h-8 px-2.5 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
            Afiliado
            <input
              name="affiliate_number"
              required
              defaultValue={defaultValues?.affiliate_number}
              className="glass-input h-8 px-2.5 py-1.5 text-sm"
            />
          </label>
        </div>
      )}

      <p className="-mt-0.5 text-[10px] text-slate-500">
        {isAdult
          ? "La cédula es obligatoria para mayores de edad."
          : "La cédula es opcional para menores de edad."}
      </p>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
        Notas (opcional)
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaultValues?.notes}
          className="glass-input resize-none px-2.5 py-1.5 text-sm"
        />
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <button type="submit" disabled={pending} className="glass-button flex-1 py-2 text-sm">
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link href="/patients" className="glass-button-light flex-1 py-2 text-center text-sm">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
