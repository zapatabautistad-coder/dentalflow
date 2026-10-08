"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  ITEM_FIELDS,
  isValidVoidReason,
  parsePrescription,
  prescriptionDbError,
  type PrescriptionItemInput,
} from "@/lib/prescriptions";

export type PrescriptionFormState = { error?: string; savedAt?: number } | undefined;

const ONLY_DOCTOR = "Solo el doctor puede recetar.";

function refresh(patientId: string) {
  revalidatePath(`/patients/${patientId}/recetas`);
}

// Las columnas del formulario llegan alineadas por posición (una por fila).
function readRows(formData: FormData): PrescriptionItemInput[] {
  const columns = Object.fromEntries(ITEM_FIELDS.map((field) => [field, formData.getAll(field).map(String)]));
  const count = Math.max(...ITEM_FIELDS.map((field) => columns[field].length));
  return Array.from({ length: count }, (_, i) =>
    Object.fromEntries(ITEM_FIELDS.map((field) => [field, columns[field][i] ?? ""])) as PrescriptionItemInput
  );
}

export async function createPrescription(
  patientId: string,
  _prev: PrescriptionFormState,
  formData: FormData
): Promise<PrescriptionFormState> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: ONLY_DOCTOR };

  const parsed = parsePrescription(readRows(formData), String(formData.get("indications") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  // Autor, nombre, exequátur y fecha los pone la base (trigger stamp_prescription).
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_prescription", {
    p_patient_id: patientId,
    p_items: parsed.items,
    p_indications: parsed.indications,
  });
  if (error) return { error: prescriptionDbError(error.message, "No se pudo guardar la receta. Inténtalo de nuevo.") };

  refresh(patientId);
  return { savedAt: Date.now() };
}

export async function voidPrescription(
  patientId: string,
  prescriptionId: string,
  _prev: PrescriptionFormState,
  formData: FormData
): Promise<PrescriptionFormState> {
  const profile = await requireProfile();
  if (profile.role !== "doctor") return { error: "Solo el doctor que hizo la receta puede anularla." };

  const reason = String(formData.get("void_reason") ?? "").trim();
  if (!isValidVoidReason(reason)) return { error: "El motivo debe tener entre 5 y 500 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .update({ void_reason: reason })
    .eq("id", prescriptionId)
    .eq("patient_id", patientId)
    .eq("doctor_id", profile.userId)
    .is("voided_at", null)
    .select("id");
  if (error) return { error: prescriptionDbError(error.message, "No se pudo anular la receta. Inténtalo de nuevo.") };
  if (!data?.length) return { error: "La receta ya está anulada o no es tuya." };

  refresh(patientId);
  return { savedAt: Date.now() };
}
