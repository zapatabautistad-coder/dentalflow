"use client";

import Link from "next/link";
import { useActionState } from "react";
import { DURATION_OPTIONS, STATUS_ORDER, STATUS_META } from "./status";
import { PatientPicker } from "./patient-picker";
import type { AppointmentFormState, PatientResult } from "./actions";

type Doctor = { id: string; full_name: string };

type AppointmentFormProps = {
  action: (
    prevState: AppointmentFormState,
    formData: FormData
  ) => Promise<AppointmentFormState>;
  doctors: Doctor[];
  defaultPatient?: PatientResult | null;
  defaultValues?: {
    doctor_id?: string;
    date?: string;
    time?: string;
    duration_minutes?: number;
    reason?: string;
    status?: string;
  };
  showStatus?: boolean;
  submitLabel: string;
  pendingLabel: string;
};

export function AppointmentForm({
  action,
  doctors,
  defaultPatient,
  defaultValues,
  showStatus = false,
  submitLabel,
  pendingLabel,
}: AppointmentFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Paciente
        <PatientPicker defaultPatient={defaultPatient} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Doctor
        <select
          name="doctor_id"
          required
          defaultValue={defaultValues?.doctor_id ?? ""}
          className="glass-input"
        >
          <option value="" disabled>
            Selecciona un doctor
          </option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.full_name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Fecha
          <input
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date}
            className="glass-input"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Hora
          <input
            name="time"
            type="time"
            required
            defaultValue={defaultValues?.time}
            className="glass-input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Duración
        <select
          name="duration_minutes"
          required
          defaultValue={String(defaultValues?.duration_minutes ?? 30)}
          className="glass-input"
        >
          {DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Motivo (opcional)
        <input
          name="reason"
          defaultValue={defaultValues?.reason}
          placeholder="Limpieza, revisión, dolor…"
          className="glass-input"
        />
      </label>

      {showStatus && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Estado
          <select
            name="status"
            required
            defaultValue={defaultValues?.status ?? "programada"}
            className="glass-input"
          >
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
        </label>
      )}

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
        <Link href="/appointments" className="glass-button-light flex-1 text-center">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
