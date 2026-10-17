"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { canCloseEncounter, canOpenEncounter } from "@/lib/encounters";

export type EncounterFormState = { errorKey: string } | { saved: true; at: number } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Autor, rol, estado y fechas los pone la base: la app solo envía paciente, cita y motivo.
export async function openEncounter(
  patientId: string,
  _prev: EncounterFormState,
  formData: FormData
): Promise<EncounterFormState> {
  const profile = await requireProfile();
  if (!canOpenEncounter(profile.role)) return { errorKey: "encounters.error.permission" };

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length > 500) return { errorKey: "encounters.error.reasonLong" };

  const appointmentId = String(formData.get("appointment_id") ?? "").trim();
  if (appointmentId && !UUID.test(appointmentId)) return { errorKey: "encounters.error.database" };

  const supabase = await createClient();
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("archived_at")
    .eq("id", patientId)
    .maybeSingle<{ archived_at: string | null }>();
  if (patientError || !patient) return { errorKey: "encounters.error.database" };
  if (patient.archived_at) return { errorKey: "encounters.error.archived" };

  if (appointmentId) {
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .eq("patient_id", patientId)
      .maybeSingle();
    if (appointmentError) return { errorKey: "encounters.error.database" };
    if (!appointment) return { errorKey: "encounters.error.appointment" };
  }

  const { error } = await supabase.from("encounters").insert({
    patient_id: patientId,
    appointment_id: appointmentId || null,
    reason: reason || null,
  });

  if (error) {
    return { errorKey: error.code === "23505" ? "encounters.error.appointmentTaken" : "encounters.error.database" };
  }

  revalidatePath(`/patients/${patientId}`);
  return { saved: true, at: Date.now() };
}

export async function closeEncounter(
  patientId: string,
  encounterId: string,
  _prev: EncounterFormState,
  formData: FormData
): Promise<EncounterFormState> {
  const profile = await requireProfile();
  if (!canCloseEncounter(profile.role)) return { errorKey: "encounters.error.permission" };

  const note = String(formData.get("closure_note") ?? "").trim();
  if (note.length > 1000) return { errorKey: "encounters.error.noteLong" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("encounters")
    .update({ status: "cerrada", closure_note: note || null })
    .eq("id", encounterId)
    .eq("patient_id", patientId)
    .eq("status", "abierta")
    .select("id")
    .maybeSingle();

  if (error || !data) return { errorKey: "encounters.error.closeFailed" };

  revalidatePath(`/patients/${patientId}`);
  return { saved: true, at: Date.now() };
}
