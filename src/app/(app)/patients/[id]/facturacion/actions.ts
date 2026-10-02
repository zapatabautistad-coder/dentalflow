"use server";

// Acciones de facturación. La pantalla (page.tsx y componentes) la arma
// Copilot sobre estas acciones; aquí no se cambia sin revisar la 020.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageBilling, requireProfile } from "@/lib/auth";
import { ARS_NEXT, PAYMENT_METHOD_LABELS, type ArsClaimStatus, type PaymentMethod } from "@/lib/billing";
import { parseCost } from "@/lib/treatment-plan";

export type BillingFormState = { error?: string; savedAt?: number; receiptNumber?: number } | undefined;

const NOT_ALLOWED = "Solo recepción y administración pueden registrar cobros.";

function refresh(patientId: string) {
  revalidatePath(`/patients/${patientId}/facturacion`);
  revalidatePath(`/patients/${patientId}`);
}

function reasonFrom(formData: FormData): string | { error: string } {
  const reason = String(formData.get("void_reason") ?? "").trim();
  if (reason.length < 5) return { error: "Escribe el motivo de la anulación (mínimo 5 caracteres)." };
  if (reason.length > 500) return { error: "El motivo admite hasta 500 caracteres." };
  return reason;
}

// Cargo: description, amount, ars_coverage (opcional), ars_name y
// ars_authorization (si hay cobertura), treatment_plan_item_id (opcional).
export async function addCharge(patientId: string, _prev: BillingFormState, formData: FormData): Promise<BillingFormState> {
  const profile = await requireProfile();
  if (!canManageBilling(profile.role)) return { error: NOT_ALLOWED };

  const description = String(formData.get("description") ?? "").trim();
  const amount = parseCost(String(formData.get("amount") ?? ""));
  const coverage = parseCost(String(formData.get("ars_coverage") ?? "")) ?? 0;
  const arsName = String(formData.get("ars_name") ?? "").trim();
  const arsAuthorization = String(formData.get("ars_authorization") ?? "").trim();
  const planItemId = String(formData.get("treatment_plan_item_id") ?? "").trim() || null;

  if (description.length < 2 || description.length > 200) return { error: "Escribe la descripción del cargo." };
  if (amount === null || Number.isNaN(amount) || amount <= 0) return { error: "El monto no es válido. Ej.: 3,500" };
  if (Number.isNaN(coverage) || coverage < 0) return { error: "La cobertura de la ARS no es válida." };
  if (coverage > amount) return { error: "La cobertura de la ARS no puede ser mayor que el monto." };
  if (coverage > 0 && !arsName) return { error: "Indica la ARS que cubre el cargo." };
  if (arsName.length > 120 || arsAuthorization.length > 60) return { error: "El nombre o la autorización de la ARS son demasiado largos." };

  const supabase = await createClient();
  const { error } = await supabase.from("billing_charges").insert({
    patient_id: patientId,
    description,
    amount,
    ars_coverage: coverage,
    ars_name: coverage > 0 ? arsName : null,
    ars_authorization: coverage > 0 && arsAuthorization ? arsAuthorization : null,
    treatment_plan_item_id: planItemId,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Ese procedimiento del plan ya fue cobrado." : "No se pudo guardar el cargo. Inténtalo de nuevo.",
    };
  }

  refresh(patientId);
  return { savedAt: Date.now() };
}

// Pago: amount, method, reference (opcional), note (opcional).
// Devuelve el número de recibo que asignó la base.
export async function addPayment(patientId: string, _prev: BillingFormState, formData: FormData): Promise<BillingFormState> {
  const profile = await requireProfile();
  if (!canManageBilling(profile.role)) return { error: NOT_ALLOWED };

  const amount = parseCost(String(formData.get("amount") ?? ""));
  const method = String(formData.get("method") ?? "") as PaymentMethod;
  const reference = String(formData.get("reference") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (amount === null || Number.isNaN(amount) || amount <= 0) return { error: "El monto no es válido. Ej.: 1,500" };
  if (!(method in PAYMENT_METHOD_LABELS)) return { error: "Selecciona la forma de pago." };
  if (reference.length > 100 || note.length > 500) return { error: "La referencia o la nota son demasiado largas." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_payments")
    .insert({ patient_id: patientId, amount, method, reference: reference || null, note: note || null })
    .select("receipt_number")
    .single<{ receipt_number: number }>();
  if (error || !data) return { error: "No se pudo registrar el pago. Inténtalo de nuevo." };

  refresh(patientId);
  return { savedAt: Date.now(), receiptNumber: data.receipt_number };
}

export async function voidCharge(patientId: string, chargeId: string, _prev: BillingFormState, formData: FormData): Promise<BillingFormState> {
  const profile = await requireProfile();
  if (!canManageBilling(profile.role)) return { error: NOT_ALLOWED };
  const reason = reasonFrom(formData);
  if (typeof reason !== "string") return reason;

  const supabase = await createClient();
  const { error } = await supabase
    .from("billing_charges")
    .update({ voided_at: new Date().toISOString(), void_reason: reason })
    .eq("id", chargeId)
    .eq("patient_id", patientId);
  if (error) return { error: "No se pudo anular el cargo. Recarga la página e inténtalo de nuevo." };

  refresh(patientId);
  return { savedAt: Date.now() };
}

export async function voidPayment(patientId: string, paymentId: string, _prev: BillingFormState, formData: FormData): Promise<BillingFormState> {
  const profile = await requireProfile();
  if (!canManageBilling(profile.role)) return { error: NOT_ALLOWED };
  const reason = reasonFrom(formData);
  if (typeof reason !== "string") return reason;

  const supabase = await createClient();
  const { error } = await supabase
    .from("billing_payments")
    .update({ voided_at: new Date().toISOString(), void_reason: reason })
    .eq("id", paymentId)
    .eq("patient_id", patientId);
  if (error) return { error: "No se pudo anular el pago. Recarga la página e inténtalo de nuevo." };

  refresh(patientId);
  return { savedAt: Date.now() };
}

// Reclamo a la ARS: pendiente → reclamado → pagado o rechazado.
// Para useActionState: advanceArsClaim.bind(null, patientId, chargeId, actual, siguiente).
export async function advanceArsClaim(
  patientId: string,
  chargeId: string,
  current: ArsClaimStatus,
  next: ArsClaimStatus
): Promise<BillingFormState> {
  const profile = await requireProfile();
  if (!canManageBilling(profile.role)) return { error: NOT_ALLOWED };
  if (!ARS_NEXT[current]?.includes(next)) return { error: "Ese cambio de estado de la ARS no es válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("billing_charges")
    .update({ ars_status: next })
    .eq("id", chargeId)
    .eq("patient_id", patientId)
    .eq("ars_status", current);
  if (error) return { error: "No se pudo actualizar el reclamo. Recarga la página e inténtalo de nuevo." };

  refresh(patientId);
  return { savedAt: Date.now() };
}
