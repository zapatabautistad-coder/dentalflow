"use client";

import { useEffect, useId, useState } from "react";
import { MEDICAL_ALERT_LABELS, type MedicalAlert } from "@/lib/medical-alerts";

type Language = "es" | "en";

function alertText(alert: MedicalAlert, language: Language): string {
  const label = MEDICAL_ALERT_LABELS[alert.key][language];
  return alert.detail ? `${label}: ${alert.detail}` : label;
}

export function MedicalAlertChip({ alerts }: { alerts: MedicalAlert[] }) {
  const [language, setLanguage] = useState<Language>("es");
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  useEffect(() => {
    const syncLanguage = () => setLanguage(document.documentElement.lang === "en" ? "en" : "es");
    syncLanguage();

    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  if (alerts.length === 0) return null;

  const details = alerts.map((alert) => alertText(alert, language)).join("; ");
  const chipLabel = language === "en" ? "Medical alert" : "Alerta médica";
  const accessibleLabel = `${chipLabel}: ${details}`;

  return (
    <span className="group relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        title={accessibleLabel}
        aria-label={accessibleLabel}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className="inline-flex min-h-6 items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold leading-tight text-rose-800 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <span data-i18n="medicalAlert.chip">Alerta médica</span>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-0 top-full z-30 mt-1 w-max max-w-[min(80vw,22rem)] break-words rounded-lg border border-rose-200 bg-white px-3 py-2 text-left text-xs font-medium leading-relaxed text-rose-900 shadow-lg transition-opacity ${
          open
            ? "visible opacity-100"
            : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        }`}
      >
        {alerts.map((alert, index) => (
          <span key={`${alert.key}-${index}`}>
            {index > 0 ? "; " : ""}
            <span data-i18n={`medicalAlert.${alert.key}`}>{MEDICAL_ALERT_LABELS[alert.key][language]}</span>
            {alert.detail ? `: ${alert.detail}` : ""}
          </span>
        ))}
      </span>
    </span>
  );
}