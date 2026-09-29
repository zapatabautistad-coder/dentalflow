"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canCreatePatients, canManagePatients, canWriteClinicalEntries, requireProfile } from "@/lib/auth";
import { combineDateTime, isValidDateKey } from "@/lib/timezone";
import { cleanDocumentIdDigits, cleanPhoneDigits } from "@/lib/phone";

export type PatientFormState = { error: string } | undefined;

type ParsedPatient =
  | { ok: true; values: PatientValues }
  | { ok: false; error: string };

type PatientValues = {
  full_name: string;
  document_id: string | null;
  phone: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  insurance_type: "ars" | "privado" | null;
  insurance_provider: string | null;
  affiliate_number: string | null;
};

function isAdult(birthDate: string): boolean {
  if (!birthDate) return true;

  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return true;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

function parsePatientForm(formData: FormData): ParsedPatient {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rawDocumentId = String(formData.get("document_id") ?? "").trim();
  const documentId = cleanDocumentIdDigits(rawDocumentId);
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = cleanPhoneDigits(rawPhone);
  const email = String(formData.get("email") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rawInsuranceType = String(formData.get("insurance_type") ?? "").trim();
  const insuranceProvider = String(formData.get("insurance_provider") ?? "").trim();
  const affiliateNumber = String(formData.get("affiliate_number") ?? "").trim();
  const mustHaveDocumentId = isAdult(birthDate);

  if (!fullName || !phone) {
    return { ok: false, error: "El nombre completo y el teléfono son obligatorios." };
  }

  if (rawInsuranceType !== "" && rawInsuranceType !== "ars" && rawInsuranceType !== "privado") {
    return { ok: false, error: "La aseguradora seleccionada no es válida." };
  }

  if (rawInsuranceType === "ars" && (!insuranceProvider || !affiliateNumber)) {
    return {
      ok: false,
      error: "El nombre de la ARS y el número de afiliado son obligatorios.",
    };
  }

  if (phone.length !== 10) {
    return { ok: false, error: "El teléfono debe tener 10 dígitos." };
  }

  if (mustHaveDocumentId && !documentId) {
    return {
      ok: false,
      error: "La cédula es obligatoria para pacientes mayores de edad.",
    };
  }

  if (documentId && documentId.length !== 11) {
    return {
      ok: false,
      error: "La cédula debe tener 11 dígitos en el formato 000-0000000-0.",
    };
  }

  const insuranceType = rawInsuranceType === "" ? null : rawInsuranceType;

  return {
    ok: true,
    values: {
      full_name: fullName,
      document_id: documentId || null,
      phone,
      email: email || null,
      birth_date: birthDate || null,
      notes: notes || null,
      insurance_type: insuranceType,
      insurance_provider: insuranceType === "ars" ? insuranceProvider : null,
      affiliate_number: insuranceType === "ars" ? affiliateNumber : null,
    },
  };
}

export async function createPatient(
  _prev: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const profile = await requireProfile();
  if (!canCreatePatients(profile.role)) {
    return { error: "No tienes permiso para crear pacientes." };
  }

  const parsed = parsePatientForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("patients")
    .insert(parsed.values)
    .select("id")
    .single();

  if (error || !created) {
    return { error: "No se pudo guardar el paciente. Inténtalo de nuevo." };
  }

  revalidatePath("/patients");
  redirect(`/patients/${created.id}`);
}

export async function updatePatient(
  patientId: string,
  _prev: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const profile = await requireProfile();
  if (!canManagePatients(profile.role)) {
    return { error: "No tienes permiso para editar pacientes." };
  }

  const parsed = parsePatientForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update(parsed.values)
    .eq("id", patientId);

  if (error) {
    return { error: "No se pudo actualizar el paciente. Inténtalo de nuevo." };
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export type ArchiveState = { error: string } | undefined;

export async function archivePatient(
  patientId: string,
  _prev: ArchiveState,
  formData: FormData
): Promise<ArchiveState> {
  const profile = await requireProfile();
  if (!canManagePatients(profile.role)) {
    return { error: "No tienes permiso para archivar pacientes." };
  }

  const reason = String(formData.get("archived_reason") ?? "").trim();
  if (reason.length < 5) {
    return { error: "Escribe el motivo del archivado (mínimo 5 caracteres)." };
  }
  if (reason.length > 500) {
    return { error: "El motivo admite hasta 500 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({ archived_at: new Date().toISOString(), archived_reason: reason })
    .eq("id", patientId);

  if (error) {
    return { error: "No se pudo archivar el paciente. Inténtalo de nuevo." };
  }

  revalidatePath("/patients");
  revalidatePath("/panel");
  revalidatePath(`/patients/${patientId}`);
  return undefined;
}

export async function restorePatient(patientId: string): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("patients")
    .update({ archived_at: null, archived_reason: null })
    .eq("id", patientId);

  revalidatePath("/patients");
  revalidatePath("/panel");
  revalidatePath(`/patients/${patientId}`);
}

export type MedicalHistoryState ={ error: string } | { saved: true } | undefined;

const MEDICAL_FLAGS = [
  "allergy_penicillin",
  "allergy_local_anesthetic",
  "allergy_latex",
  "allergy_nsaids",
  "takes_anticoagulants",
  "takes_bisphosphonates",
  "has_diabetes",
  "has_hypertension",
  "has_heart_disease",
  "is_pregnant",
] as const;

const MEDICAL_TEXT_FIELDS = ["allergies_other", "current_medications", "conditions_other"] as const;
const MEDICAL_TEXT_MAX = 1000;

export async function saveMedicalHistory(
  patientId: string,
  _prev: MedicalHistoryState,
  formData: FormData
): Promise<MedicalHistoryState> {
  await requireProfile();

  const values: Record<string, boolean | string | null> = { patient_id: patientId };
  for (const flag of MEDICAL_FLAGS) {
    values[flag] = formData.get(flag) === "on";
  }
  for (const field of MEDICAL_TEXT_FIELDS) {
    const text = String(formData.get(field) ?? "").trim();
    if (text.length > MEDICAL_TEXT_MAX) {
      return { error: `Cada campo de texto admite hasta ${MEDICAL_TEXT_MAX} caracteres.` };
    }
    values[field] = text || null;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_medical_history")
    .upsert(values, { onConflict: "patient_id" });

  if (error) {
    return { error: "No se pudo guardar el historial médico. Inténtalo de nuevo." };
  }

  revalidatePath(`/patients/${patientId}`);
  return { saved: true };
}

type ClinicalEntryFormValues = {
  body: string;
  medication_name: string;
  dose: string;
  route: string;
  administered_date: string;
  administered_time: string;
  correction_reason: string;
};

export type ClinicalEntryState =
  | { error: string; allergyWarning?: boolean; values?: ClinicalEntryFormValues; attemptId?: string }
  | { saved: true; at: number }
  | undefined;

const CLINICAL_KINDS = ["nota", "medicamento", "procedimiento"] as const;
type ClinicalKind = (typeof CLINICAL_KINDS)[number];

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function clinicalEntryFormValues(formData: FormData): ClinicalEntryFormValues {
  return {
    body: field(formData, "body"),
    medication_name: field(formData, "medication_name"),
    dose: field(formData, "dose"),
    route: field(formData, "route"),
    administered_date: field(formData, "administered_date"),
    administered_time: field(formData, "administered_time"),
    correction_reason: field(formData, "correction_reason"),
  };
}

function normalizeAllergyText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasMedicationTerm(medication: string, term: string): boolean {
  return ` ${normalizeAllergyText(medication)} `.includes(` ${normalizeAllergyText(term)} `);
}

type MedicationAllergyHistory = {
  allergy_penicillin: boolean;
  allergy_nsaids: boolean;
  allergy_local_anesthetic: boolean;
  allergies_other: string | null;
};

function matchingMedicationAllergy(
  medication: string,
  history: MedicationAllergyHistory
): string | null {
  const allergyGroups = [
    {
      recorded: history.allergy_penicillin,
      label: "penicilina",
      terms: [
        "penicilina",
        "amoxicilina",
        "ampicilina",
        "amoxicilina/clavulánico",
        "augmentin",
        "dicloxacilina",
        "cefalexina",
      ],
    },
    {
      recorded: history.allergy_nsaids,
      label: "AINEs",
      terms: [
        "ibuprofeno",
        "naproxeno",
        "diclofenaco",
        "ketorolaco",
        "aspirina",
        "ácido acetilsalicílico",
        "meloxicam",
        "nimesulida",
      ],
    },
    {
      recorded: history.allergy_local_anesthetic,
      label: "anestésicos locales",
      terms: ["lidocaína", "articaína", "mepivacaína", "bupivacaína", "prilocaína"],
    },
  ];

  for (const group of allergyGroups) {
    if (group.recorded && group.terms.some((term) => hasMedicationTerm(medication, term))) {
      return group.label;
    }
  }

  const otherAllergy = history.allergies_other?.trim();
  if (otherAllergy) {
    const medicationTerms = normalizeAllergyText(medication)
      .split(" ")
      .filter((term) => /[a-z]{4,}/.test(term));
    const normalizedOther = ` ${normalizeAllergyText(otherAllergy)} `;
    if (medicationTerms.some((term) => normalizedOther.includes(` ${term} `))) return otherAllergy;
  }

  return null;
}

export async function addClinicalEntry(
  patientId: string,
  _prev: ClinicalEntryState,
  formData: FormData
): Promise<ClinicalEntryState> {
  const profile = await requireProfile();
  if (!canWriteClinicalEntries(profile.role)) {
    return { error: "Solo doctores y enfermería pueden escribir en el registro clínico." };
  }

  const kind = field(formData, "kind") as ClinicalKind;
  if (!CLINICAL_KINDS.includes(kind)) {
    return { error: "Elige el tipo de entrada." };
  }

  const correctsEntryId = field(formData, "corrects_entry_id") || null;
  const correctionReason = field(formData, "correction_reason") || null;
  if (correctsEntryId && (!correctionReason || correctionReason.length < 5)) {
    return { error: "Escribe el motivo de la corrección (mínimo 5 caracteres)." };
  }
  if (correctionReason && correctionReason.length > 500) {
    return { error: "El motivo admite hasta 500 caracteres." };
  }

  const submittedValues = clinicalEntryFormValues(formData);

  const values: Record<string, string | null> = {
    patient_id: patientId,
    kind,
    corrects_entry_id: correctsEntryId,
    correction_reason: correctsEntryId ? correctionReason : null,
    body: null,
    medication_name: null,
    dose: null,
    route: null,
    administered_at: null,
  };

  if (kind === "medicamento") {
    const medication = field(formData, "medication_name");
    const dose = field(formData, "dose");
    const route = field(formData, "route");
    const date = field(formData, "administered_date");
    const time = field(formData, "administered_time");
    if (!medication || !dose || !route || !date || !time) {
      return { error: "Completa medicamento, dosis, vía, fecha y hora de administración." };
    }
    if (!isValidDateKey(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return { error: "La fecha u hora de administración no es válida." };
    }
    const administeredAt = combineDateTime(date, time);
    if (new Date(administeredAt).getTime() > Date.now() + 5 * 60_000) {
      return { error: "La hora de administración no puede estar en el futuro." };
    }
    if (medication.length > 200 || dose.length > 100 || route.length > 100) {
      return { error: "Algún campo del medicamento es demasiado largo." };
    }
    values.medication_name = medication;
    values.dose = dose;
    values.route = route;
    values.administered_at = administeredAt;
    values.body = field(formData, "body") || null;
  } else {
    const body = field(formData, "body");
    if (!body) return { error: "Escribe el contenido de la entrada." };
    values.body = body;
  }

  const supabase = await createClient();

  if (kind === "medicamento") {
    const { data: medicalHistory, error: historyError } = await supabase
      .from("patient_medical_history")
      .select("allergy_penicillin, allergy_nsaids, allergy_local_anesthetic, allergies_other")
      .eq("patient_id", patientId)
      .maybeSingle<MedicationAllergyHistory>();

    if (historyError) {
      return {
        error: "No se pudo verificar el historial médico. Recarga la página antes de administrar el medicamento.",
        values: submittedValues,
        attemptId: randomUUID(),
      };
    }

    const allergyLabel = medicalHistory ? matchingMedicationAllergy(values.medication_name ?? "", medicalHistory) : null;
    const allergyConfirmed = field(formData, "allergy_confirmed") === "on";

    if (allergyLabel && !allergyConfirmed) {
      return {
        error: `⚠ El paciente tiene registrada alergia a ${allergyLabel}. Verifica antes de administrar.`,
        allergyWarning: true,
        values: submittedValues,
        attemptId: randomUUID(),
      };
    }

    if (allergyLabel && allergyConfirmed) {
      const confirmation = "[Alerta de alergia revisada y confirmada por el profesional]";
      values.body = values.body ? `${values.body}\n${confirmation}` : confirmation;
      if (values.body.length > 4000) {
        return {
          error: "El texto admite hasta 4000 caracteres después de añadir la confirmación.",
          allergyWarning: true,
          values: submittedValues,
          attemptId: randomUUID(),
        };
      }
    }
  }

  if (values.body && values.body.length > 4000) {
    return { error: "El texto admite hasta 4000 caracteres." };
  }

  const { error } = await supabase.from("clinical_entries").insert(values);

  if (error) {
    if (error.code === "23505") {
      return { error: "Esa entrada ya fue corregida. Corrige la corrección más reciente." };
    }
    return { error: "No se pudo guardar la entrada. Inténtalo de nuevo." };
  }

  revalidatePath(`/patients/${patientId}`);
  return { saved: true, at: Date.now() };
}
