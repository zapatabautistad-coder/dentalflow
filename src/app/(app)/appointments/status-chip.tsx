"use client";

import { useEffect, useState } from "react";
import { STATUS_META, type AppointmentStatus } from "./status";

const STATUS_TEXT_BY_LANGUAGE: Record<string, Record<string, string>> = {
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

function getStoredLanguage(): string {
  if (typeof window === "undefined") return "es";

  try {
    return window.localStorage.getItem("dentalflow-language") ?? "es";
  } catch {
    return "es";
  }
}

function getStatusLabel(status: string, lang = "es"): string {
  const normalized = status as AppointmentStatus;
  return STATUS_TEXT_BY_LANGUAGE[lang]?.[normalized] ?? STATUS_TEXT_BY_LANGUAGE.es[normalized] ?? status;
}

export function StatusChip({ status }: { status: string }) {
  const [language, setLanguage] = useState<string>("es");

  useEffect(() => {
    const updateLanguage = () => setLanguage(getStoredLanguage());
    updateLanguage();
    document.addEventListener("dentalflow-language-change", updateLanguage);
    return () => document.removeEventListener("dentalflow-language-change", updateLanguage);
  }, []);

  const meta =
    STATUS_META[status as AppointmentStatus] ??
    ({
      label: status,
      dot: "bg-slate-400",
      text: "text-slate-700",
      bg: "bg-slate-100",
      border: "border-slate-200",
    } as const);

  const label = getStatusLabel(status, language);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.border} ${meta.bg} ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label}
    </span>
  );
}
