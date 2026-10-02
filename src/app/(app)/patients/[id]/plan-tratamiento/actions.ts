"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canWriteOdontogram, canWriteTreatmentPlan, requireProfile } from "@/lib/auth";
import { CONDITION_LABELS, isSurfaceCondition, isValidTooth, SURFACES, type OdontogramCondition, type Surface } from "@/lib/odontogram";
import { parseCost, type TreatmentStatus } from "@/lib/treatment-plan";

export type PlanFormState = { error?: string; savedAt?: number } | undefined;

const NOT_ALLOWED = "Solo el doctor puede modificar el plan de tratamiento.";

function refresh(patientId: string) {
  revalidatePath(`/patients/${patientId}/plan-tratamiento`);
  revalidatePath(`/patients/${patientId}`);
}

export async function addPlanItem(patientId: string, _prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const profile = await requireProfile();
  if (!canWriteTreatmentPlan(profile.role)) return { error: NOT_ALLOWED };

  const procedure = String(formData.get("procedure") ?? "").trim();
  const rawTooth = String(formData.get("tooth") ?? "").trim();
  const tooth = rawTooth ? Number(rawTooth) : null;
  const surfaces = formData.getAll("surfaces").map(String).filter((s): s is Surface => (SURFACES as string[]).includes(s));
  const cost = parseCost(String(formData.get("estimated_cost") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (procedure.length < 2 || procedure.length > 200) return { error: "Escribe el procedimiento." };
  if (tooth !== null && !isValidTooth(tooth)) return { error: "El número de diente no es válido (FDI: 11–48 o 51–85)." };
  if (surfaces.length > 0 && tooth === null) return { error: "Para marcar superficies, indica el diente." };
  if (cost !== null && Number.isNaN(cost)) return { error: "El costo no es válido. Ej.: 3,500 o 3500.00" };
  if (note.length > 500) return { error: "La nota admite hasta 500 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.from("treatment_plan_items").insert({
    patient_id: patientId,
    procedure,
    tooth,
    surfaces: surfaces.length ? [...new Set(surfaces)] : null,
    estimated_cost: cost,
    note: note || null,
  });
  if (error) return { error: "No se pudo guardar. Recarga la página e inténtalo de nuevo." };

  refresh(patientId);
  return { savedAt: Date.now() };
}

export async function movePlanItem(
  patientId: string,
  itemId: string,
  status: Exclude<TreatmentStatus, "pendiente">,
  _prev: PlanFormState,
  formData: FormData
): Promise<PlanFormState> {
  const profile = await requireProfile();
  if (!canWriteTreatmentPlan(profile.role)) return { error: NOT_ALLOWED };

  const update: { status: TreatmentStatus; cancel_reason?: string } = { status };
  if (status === "cancelado") {
    const reason = String(formData.get("cancel_reason") ?? "").trim();
    if (reason.length < 5) return { error: "Escribe el motivo de la cancelación (mínimo 5 caracteres)." };
    if (reason.length > 500) return { error: "El motivo admite hasta 500 caracteres." };
    update.cancel_reason = reason;
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("treatment_plan_items")
    .update(update)
    .eq("id", itemId)
    .eq("patient_id", patientId)
    .select("tooth, surfaces, procedure")
    .maybeSingle<{ tooth: number | null; surfaces: Surface[] | null; procedure: string }>();
  if (error || !item) return { error: "No se pudo cambiar el estado. Recarga la página e inténtalo de nuevo." };

  // Opcional: registrar el resultado en el odontograma en el mismo paso.
  // Diente y superficies salen del procedimiento guardado, no del formulario.
  const condition = String(formData.get("odontogram_condition") ?? "") as OdontogramCondition;
  if (status === "completado" && condition && item.tooth !== null) {
    refresh(patientId);
    revalidatePath(`/patients/${patientId}/odontograma`);
    if (!(condition in CONDITION_LABELS) || !canWriteOdontogram(profile.role)) {
      return { error: "El procedimiento quedó completado, pero no se pudo registrar en el odontograma." };
    }
    const surfaceCondition = isSurfaceCondition(condition);
    if (surfaceCondition && !item.surfaces?.length) {
      return { error: "El procedimiento quedó completado. Para el odontograma faltan las superficies: regístralo allí." };
    }
    const { error: odontogramError } = await supabase.from("odontogram_entries").insert({
      patient_id: patientId,
      tooth: item.tooth,
      condition,
      surfaces: surfaceCondition ? item.surfaces : null,
      note: `Plan de tratamiento: ${item.procedure}`.slice(0, 500),
    });
    if (odontogramError) {
      return { error: "El procedimiento quedó completado, pero no se pudo registrar en el odontograma. Regístralo allí." };
    }
    return { savedAt: Date.now() };
  }

  refresh(patientId);
  return { savedAt: Date.now() };
}
