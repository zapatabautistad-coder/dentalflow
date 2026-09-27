"use client";

import { useEffect, useState } from "react";
import { getCurrentLanguage, getStatusLabel, STATUS_META, type AppointmentStatus } from "./status";

export function StatusChip({ status }: { status: string }) {
  const [language, setLanguage] = useState<string>(getCurrentLanguage());

  useEffect(() => {
    const updateLanguage = () => setLanguage(getCurrentLanguage());
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
