"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canWriteOdontogram, requireProfile } from "@/lib/auth";
import {
  isSurfaceCondition,
  isValidTooth,
  SURFACES,
  type OdontogramCondition,
  type Surface,
  CONDITION_LABELS,
} from "@/lib/odontogram";

export type OdontogramFormState = { error?: string; savedAt?: number } | undefined;

const NOT_ALLOWED = "Solo el doctor puede registrar en el odontograma.";

export async function addOdontogramEntry(
  patientId: string,
  _prev: OdontogramFormState,
  formData: FormData
): Promise<OdontogramFormState> {
  const profile = await requireProfile();
  if (!canWriteOdontogram(profile.role)) return { error: NOT_ALLOWED };

  const tooth = Number(formData.get("tooth"));
  const condition = String(formData.get("condition") ?? "") as OdontogramCondition;
  const surfaces = formData.getAll("surfaces").map(String).filter((s): s is Surface => (SURFACES as string[]).includes(s));
  const note = String(formData.get("note") ?? "").trim();

  if (!isValidTooth(tooth)) return { error: "Selecciona un diente." };
  if (!(condition in CONDITION_LABELS)) return { error: "Selecciona la condición." };
  if (isSurfaceCondition(condition) && surfaces.length === 0) {
    return { error: "Marca al menos una superficie." };
  }
  if (note.length > 500) return { error: "La nota admite hasta 500 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.from("odontogram_entries").insert({
    patient_id: patientId,
    tooth,
    condition,
    surfaces: isSurfaceCondition(condition) ? [...new Set(surfaces)] : null,
    note: note || null,
  });

  if (error) return { error: "No se pudo guardar. Recarga la página e inténtalo de nuevo." };

  revalidatePath(`/patients/${patientId}/odontograma`);
  revalidatePath(`/patients/${patientId}`);
  return { savedAt: Date.now() };
}

// Anular un hallazgo registrado por error: no se borra, se agrega una
// entrada que lo anula con motivo obligatorio.
export async function voidOdontogramEntry(
  patientId: string,
  entryId: string,
  tooth: number,
  _prev: OdontogramFormState,
  formData: FormData
): Promise<OdontogramFormState> {
  const profile = await requireProfile();
  if (!canWriteOdontogram(profile.role)) return { error: NOT_ALLOWED };

  const reason = String(formData.get("correction_reason") ?? "").trim();
  if (reason.length < 5) return { error: "Escribe el motivo (mínimo 5 caracteres)." };
  if (reason.length > 500) return { error: "El motivo admite hasta 500 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.from("odontogram_entries").insert({
    patient_id: patientId,
    tooth,
    condition: null,
    surfaces: null,
    corrects_entry_id: entryId,
    correction_reason: reason,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ese hallazgo ya fue anulado."
          : "No se pudo anular. Recarga la página e inténtalo de nuevo.",
    };
  }

  revalidatePath(`/patients/${patientId}/odontograma`);
  revalidatePath(`/patients/${patientId}`);
  return { savedAt: Date.now() };
}
