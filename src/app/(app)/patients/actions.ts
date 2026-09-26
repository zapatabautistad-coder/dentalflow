"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";

export type PatientFormState = { error: string } | undefined;

type ParsedPatient =
  | { ok: true; values: PatientValues }
  | { ok: false; error: string };

type PatientValues = {
  full_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
};

function parsePatientForm(formData: FormData): ParsedPatient {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !phone) {
    return { ok: false, error: "El nombre completo y el teléfono son obligatorios." };
  }

  return {
    ok: true,
    values: {
      full_name: fullName,
      phone,
      email: email || null,
      birth_date: birthDate || null,
      notes: notes || null,
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
