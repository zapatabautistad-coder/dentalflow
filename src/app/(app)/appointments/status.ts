export type AppointmentStatus =
  | "programada"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada"
  | "no_asistio";

const STATUS_LABELS_BY_LANGUAGE: Record<string, Record<AppointmentStatus, string>> = {
  es: {
    programada: "Programada",
    confirmada: "Confirmada",
    en_curso: "En curso",
    completada: "Completada",
    cancelada: "Cancelada",
    no_asistio: "No asistió",
  },
  en: {
    programada: "Scheduled",
    confirmada: "Confirmed",
    en_curso: "In progress",
    completada: "Completed",
    cancelada: "Cancelled",
    no_asistio: "No-show",
  },
  pt: {
    programada: "Agendada",
    confirmada: "Confirmada",
    en_curso: "Em andamento",
    completada: "Concluída",
    cancelada: "Cancelada",
    no_asistio: "Não compareceu",
  },
  fr: {
    programada: "Planifiée",
    confirmada: "Confirmée",
    en_curso: "En cours",
    completada: "Terminée",
    cancelada: "Annulée",
    no_asistio: "Absent",
  },
  de: {
    programada: "Geplant",
    confirmada: "Bestätigt",
    en_curso: "In Bearbeitung",
    completada: "Abgeschlossen",
    cancelada: "Abgebrochen",
    no_asistio: "Nicht erschienen",
  },
  it: {
    programada: "Pianificata",
    confirmada: "Confermata",
    en_curso: "In corso",
    completada: "Completata",
    cancelada: "Annullata",
    no_asistio: "Assente",
  },
};

export function getCurrentLanguage(): string {
  if (typeof window === "undefined") return "es";
  return localStorage.getItem("dentalflow-language") ?? "es";
}

export function getStatusLabel(status: string, lang = getCurrentLanguage()): string {
  const normalized = status as AppointmentStatus;
  return STATUS_LABELS_BY_LANGUAGE[lang]?.[normalized] ?? STATUS_LABELS_BY_LANGUAGE.es[normalized] ?? status;
}

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
