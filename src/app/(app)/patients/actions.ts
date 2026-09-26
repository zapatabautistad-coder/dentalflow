"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";
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
  if (!canManagePatients(profile.role)) {
    return { error: "No tienes permiso para crear pacientes." };
  }

  const parsed = parsePatientForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("patients").insert(parsed.values);

  if (error) {
    return { error: "No se pudo guardar el paciente. Inténtalo de nuevo." };
  }

  revalidatePath("/patients");
  redirect("/patients");
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
  redirect("/patients");
}
