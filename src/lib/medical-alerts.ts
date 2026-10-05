export type MedicalHistoryAlerts = {
  allergy_penicillin?: boolean | null;
  allergy_local_anesthetic?: boolean | null;
  allergy_latex?: boolean | null;
  allergy_nsaids?: boolean | null;
  allergies_other?: string | null;
  takes_anticoagulants?: boolean | null;
  takes_bisphosphonates?: boolean | null;
  has_hypertension?: boolean | null;
  has_diabetes?: boolean | null;
  has_heart_disease?: boolean | null;
  is_pregnant?: boolean | null;
};

export const MEDICAL_ALERT_LABELS = {
  penicillin: { es: "Alergia a penicilina / amoxicilina", en: "Penicillin / amoxicillin allergy" },
  localAnesthetic: { es: "Alergia a anestésico local", en: "Local anesthetic allergy" },
  latex: { es: "Alergia al látex", en: "Latex allergy" },
  nsaids: { es: "Alergia a AINEs", en: "NSAID allergy" },
  otherAllergy: { es: "Otras alergias", en: "Other allergies" },
  anticoagulants: { es: "Toma anticoagulantes / antiagregantes", en: "Takes anticoagulants / antiplatelets" },
  bisphosphonates: { es: "Toma bifosfonatos", en: "Takes bisphosphonates" },
  hypertension: { es: "Hipertensión", en: "Hypertension" },
  diabetes: { es: "Diabetes", en: "Diabetes" },
  heartDisease: { es: "Cardiopatía", en: "Heart disease" },
  pregnancy: { es: "Embarazo", en: "Pregnancy" },
} as const;

export type MedicalAlertKey = keyof typeof MEDICAL_ALERT_LABELS;
export type MedicalAlert = { key: MedicalAlertKey; detail?: string };

export function medicalAlerts(history: MedicalHistoryAlerts | null | undefined): MedicalAlert[] {
  if (!history) return [];

  const alerts: MedicalAlert[] = [];
  if (history.allergy_penicillin) alerts.push({ key: "penicillin" });
  if (history.allergy_local_anesthetic) alerts.push({ key: "localAnesthetic" });
  if (history.allergy_latex) alerts.push({ key: "latex" });
  if (history.allergy_nsaids) alerts.push({ key: "nsaids" });

  const otherAllergies = history.allergies_other?.trim();
  if (otherAllergies) alerts.push({ key: "otherAllergy", detail: otherAllergies });

  if (history.takes_anticoagulants) alerts.push({ key: "anticoagulants" });
  if (history.takes_bisphosphonates) alerts.push({ key: "bisphosphonates" });
  if (history.has_hypertension) alerts.push({ key: "hypertension" });
  if (history.has_diabetes) alerts.push({ key: "diabetes" });
  if (history.has_heart_disease) alerts.push({ key: "heartDisease" });
  if (history.is_pregnant) alerts.push({ key: "pregnancy" });

  return alerts;
}