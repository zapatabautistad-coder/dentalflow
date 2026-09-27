"use client";

import { useActionState } from "react";
import { DOCTOR_ALLOWED_STATUSES, STATUS_META } from "./status";
import type { AppointmentFormState } from "./actions";

export function StatusForm({
  action,
  currentStatus,
}: {
  action: (
    prevState: AppointmentFormState,
    formData: FormData
  ) => Promise<AppointmentFormState>;
  currentStatus: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium" data-i18n="appointments.form.status">
        Estado de la cita
        <select
          name="status"
          required
          defaultValue={currentStatus}
          className="glass-input"
        >
          {DOCTOR_ALLOWED_STATUSES.includes(currentStatus as (typeof DOCTOR_ALLOWED_STATUSES)[number]) ? null : (
            <option value={currentStatus}>{STATUS_META[currentStatus as keyof typeof STATUS_META]?.label ?? currentStatus}</option>
          )}
          {DOCTOR_ALLOWED_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="glass-button" data-i18n={pending ? "appointments.status.updating" : "appointments.status.update"}>
        {pending ? "Actualizando…" : "Actualizar estado"}
      </button>
    </form>
  );
}
