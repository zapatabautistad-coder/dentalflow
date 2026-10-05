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

export type VitalSignsInput = {
  systolic: string;
  diastolic: string;
  heart_rate: string;
  glucose_mg_dl: string;
  oxygen_saturation: string;
  note: string;
};

export type ParsedVitalSignsInput = {
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  glucose_mg_dl: number | null;
  oxygen_saturation: number | null;
  note: string | null;
};

export type VitalSignsInputErrorKey =
  | "vitalSigns.error.systolic"
  | "vitalSigns.error.diastolic"
  | "vitalSigns.error.heartRate"
  | "vitalSigns.error.glucose"
  | "vitalSigns.error.oxygenSaturation"
  | "vitalSigns.error.pressurePair"
  | "vitalSigns.error.pressureOrder"
  | "vitalSigns.error.someValue"
  | "vitalSigns.error.noteLength";

export type VitalSignsInputResult =
  | { ok: true; values: ParsedVitalSignsInput }
  | { ok: false; errorKey: VitalSignsInputErrorKey };

function parseMeasurement(value: string, min: number, max: number): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

export function parseVitalSignsInput(input: VitalSignsInput): VitalSignsInputResult {
  const systolic = parseMeasurement(input.systolic, 60, 260);
  if (systolic === undefined) return { ok: false, errorKey: "vitalSigns.error.systolic" };

  const diastolic = parseMeasurement(input.diastolic, 30, 160);
  if (diastolic === undefined) return { ok: false, errorKey: "vitalSigns.error.diastolic" };

  const heartRate = parseMeasurement(input.heart_rate, 30, 220);
  if (heartRate === undefined) return { ok: false, errorKey: "vitalSigns.error.heartRate" };

  const glucose = parseMeasurement(input.glucose_mg_dl, 20, 600);
  if (glucose === undefined) return { ok: false, errorKey: "vitalSigns.error.glucose" };

  const oxygenSaturation = parseMeasurement(input.oxygen_saturation, 50, 100);
  if (oxygenSaturation === undefined) return { ok: false, errorKey: "vitalSigns.error.oxygenSaturation" };

  if ((systolic === null) !== (diastolic === null)) {
    return { ok: false, errorKey: "vitalSigns.error.pressurePair" };
  }
  if (systolic !== null && diastolic !== null && systolic <= diastolic) {
    return { ok: false, errorKey: "vitalSigns.error.pressureOrder" };
  }

  const note = input.note.trim();
  if (input.note.length > 500) return { ok: false, errorKey: "vitalSigns.error.noteLength" };
  if (systolic === null && heartRate === null && glucose === null && oxygenSaturation === null) {
    return { ok: false, errorKey: "vitalSigns.error.someValue" };
  }

  return {
    ok: true,
    values: {
      systolic,
      diastolic,
      heart_rate: heartRate,
      glucose_mg_dl: glucose,
      oxygen_saturation: oxygenSaturation,
      note: note || null,
    },
  };
}

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
