export type AppointmentStatus =
  | "programada"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada"
  | "no_asistio";

export const STATUS_ORDER: AppointmentStatus[] = [
  "programada",
  "confirmada",
  "en_curso",
  "completada",
  "cancelada",
  "no_asistio",
];

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  programada: {
    label: "Programada",
    dot: "bg-slate-400",
    text: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  confirmada: {
    label: "Confirmada",
    dot: "bg-sky-500",
    text: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  en_curso: {
    label: "En curso",
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  completada: {
    label: "Completada",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  cancelada: {
    label: "Cancelada",
    dot: "bg-rose-500",
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  no_asistio: {
    label: "No asistió",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

// El doctor no puede cancelar citas (reservado a admin/recepción, ver
// 003_doctor_status_update.sql).
export const DOCTOR_ALLOWED_STATUSES: AppointmentStatus[] = [
  "confirmada",
  "en_curso",
  "completada",
  "no_asistio",
];

export const DURATION_OPTIONS = [15, 30, 45, 60] as const;
