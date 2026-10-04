// Signos vitales (migración 026): clasificación y ayudas para la pantalla.
// Solo categorías estándar (presión según AHA/ACC 2017; definiciones usuales
// en adultos para pulso, glucemia y saturación). No da indicaciones de
// tratamiento: la decisión clínica es del doctor.

export type VitalSignsEntry = {
  id: string;
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  glucose_mg_dl: number | null;
  oxygen_saturation: number | null;
  corrects_entry_id: string | null;
  created_at: string;
};

export type BloodPressureCategory = "normal" | "elevada" | "hta1" | "hta2" | "crisis";

export const BLOOD_PRESSURE_LABELS: Record<BloodPressureCategory, string> = {
  normal: "Normal",
  elevada: "Elevada",
  hta1: "Hipertensión etapa 1",
  hta2: "Hipertensión etapa 2",
  crisis: "Crisis hipertensiva",
};

export function classifyBloodPressure(systolic: number, diastolic: number): BloodPressureCategory {
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "hta2";
  if (systolic >= 130 || diastolic >= 80) return "hta1";
  if (systolic >= 120) return "elevada";
  return "normal";
}

export type VitalAlert = { field: keyof VitalSignsEntry; message: string };

// Valores fuera de lo normal para resaltar en pantalla.
export function vitalAlerts(entry: Omit<VitalSignsEntry, "id" | "corrects_entry_id" | "created_at">): VitalAlert[] {
  const alerts: VitalAlert[] = [];
  if (entry.systolic !== null && entry.diastolic !== null) {
    const category = classifyBloodPressure(entry.systolic, entry.diastolic);
    if (category === "hta2" || category === "crisis") {
      alerts.push({ field: "systolic", message: BLOOD_PRESSURE_LABELS[category] });
    }
  }
  if (entry.heart_rate !== null) {
    if (entry.heart_rate < 60) alerts.push({ field: "heart_rate", message: "Bradicardia (< 60 lpm)" });
    else if (entry.heart_rate > 100) alerts.push({ field: "heart_rate", message: "Taquicardia (> 100 lpm)" });
  }
  if (entry.glucose_mg_dl !== null && entry.glucose_mg_dl < 70) {
    alerts.push({ field: "glucose_mg_dl", message: "Hipoglucemia (< 70 mg/dL)" });
  }
  if (entry.oxygen_saturation !== null && entry.oxygen_saturation < 90) {
    alerts.push({ field: "oxygen_saturation", message: "Saturación baja (< 90 %)" });
  }
  return alerts;
}

type RiskHistory = {
  has_hypertension?: boolean | null;
  has_diabetes?: boolean | null;
  has_heart_disease?: boolean | null;
};

// Antecedentes que hacen recomendable tomar signos vitales antes de atender.
export function vitalSignsReasons(history: RiskHistory | null | undefined): string[] {
  if (!history) return [];
  const reasons: string[] = [];
  if (history.has_hypertension) reasons.push("hipertensión");
  if (history.has_diabetes) reasons.push("diabetes");
  if (history.has_heart_disease) reasons.push("cardiopatía");
  return reasons;
}

// Tomas vigentes, de la más reciente a la más antigua: una toma corregida
// queda reemplazada por su corrección (que se muestra en su lugar).
export function currentVitalSigns<T extends VitalSignsEntry>(entries: T[]): T[] {
  const corrected = new Set(entries.map((e) => e.corrects_entry_id).filter((id): id is string => id !== null));
  return entries
    .filter((e) => !corrected.has(e.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
