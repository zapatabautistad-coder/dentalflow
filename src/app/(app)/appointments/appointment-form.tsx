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

  // React descarta los campos no controlados al terminar cada envío del
  // action, incluso si este devuelve un error. Se usan los valores enviados
  // (si los hay) como nuevo defaultValue y se fuerza el remount con `key`
  // (el attemptId que genera el servidor en cada intento) para que el campo
  // muestre lo último que escribió el usuario.
  const attempt = state?.attemptId ?? "initial";
  const submitted = state?.values;

  const doctorId = submitted?.doctor_id ?? defaultValues?.doctor_id ?? "";
  const date = submitted?.date ?? defaultValues?.date ?? "";
  const time = submitted?.time ?? defaultValues?.time ?? "";
  const durationMinutes = submitted?.duration_minutes ?? String(defaultValues?.duration_minutes ?? 30);
  const reason = submitted?.reason ?? defaultValues?.reason ?? "";
  const status = submitted?.status ?? defaultValues?.status ?? "programada";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* div y no label: dentro de un label, el clic en un resultado se reenvía
          al botón "Cambiar" que aparece al seleccionar y borra la selección. */}
      <div className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.patient">
        Paciente
        <PatientPicker defaultPatient={defaultPatient} />
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.doctor">
        Doctor
        <select
          key={`doctor-${attempt}`}
          name="doctor_id"
          required
          defaultValue={doctorId}
          className="glass-input"
        >
          <option value="" disabled data-i18n="appointments.form.selectDoctor">
            Selecciona un doctor
          </option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.full_name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.date">
          Fecha
          <input
            key={`date-${attempt}`}
            name="date"
            type="date"
            required
            defaultValue={date}
            className="glass-input"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.time">
          Hora
          <input
            key={`time-${attempt}`}
            name="time"
            type="time"
            required
            defaultValue={time}
            className="glass-input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.duration">
        Duración
        <select
          key={`duration-${attempt}`}
          name="duration_minutes"
          required
          defaultValue={durationMinutes}
          className="glass-input"
        >
          {DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.reason">
        Motivo (opcional)
        <input
          key={`reason-${attempt}`}
          name="reason"
          defaultValue={reason}
          placeholder="Limpieza, revisión, dolor…"
          data-i18n-placeholder="appointments.form.reasonPlaceholder"
          className="glass-input"
        />
      </label>

      {showStatus && (
        <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.status">
          Estado
          <select
            key={`status-${attempt}`}
            name="status"
            required
            defaultValue={status}
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
        <button type="submit" disabled={pending} className="glass-button flex-1" data-i18n="appointments.form.save">
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link href="/appointments" className="glass-button-light flex-1 text-center" data-i18n="appointments.form.cancel">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
