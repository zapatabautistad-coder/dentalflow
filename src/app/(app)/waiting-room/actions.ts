"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { dayBoundsUtc, todayDateKey } from "@/lib/timezone";

type QueueStatus = "en_espera" | "llamado" | "en_atencion" | "atendido" | "cancelado";

const QUEUE_STATUSES = new Set<QueueStatus>([
  "en_espera",
  "llamado",
  "en_atencion",
  "atendido",
  "cancelado",
]);

function refreshQueueViews() {
  revalidatePath("/waiting-room");
  revalidatePath("/appointments");
  revalidatePath("/panel");
}

async function hasAppointmentEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dateKey: string,
  appointmentId: string
) {
  const { data, error } = await supabase
    .from("queue")
    .select("id")
    .eq("queue_date", dateKey)
    .eq("appointment_id", appointmentId)
    .limit(1);

  return { exists: Boolean(data?.length), error };
}

export async function checkInAppointment(appointmentId: string) {
  const profile = await requireProfile();
  if (!canManageAppointments(profile.role)) redirect("/waiting-room?error=permission");

  const dateKey = todayDateKey();
  const { start, end } = dayBoundsUtc(dateKey);
  const supabase = await createClient();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, patient_id, doctor_id")
    .eq("id", appointmentId)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .maybeSingle();

  if (appointmentError || !appointment) redirect("/waiting-room?error=appointment");

  const existingEntry = await hasAppointmentEntry(supabase, dateKey, appointmentId);
  if (existingEntry.error) redirect("/waiting-room?error=save");
  if (existingEntry.exists) {
    refreshQueueViews();
    return;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: lastEntry, error: positionError } = await supabase
      .from("queue")
      .select("position")
      .eq("queue_date", dateKey)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle<{ position: number }>();

    if (positionError) redirect("/waiting-room?error=save");

    const { error: insertError } = await supabase.from("queue").insert({
      queue_date: dateKey,
      position: (lastEntry?.position ?? 0) + 1,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      doctor_id: appointment.doctor_id,
    });

    if (!insertError) {
      refreshQueueViews();
      return;
    }

    if (insertError.code !== "23505" || attempt === 1) {
      redirect("/waiting-room?error=save");
    }

    const duplicateEntry = await hasAppointmentEntry(supabase, dateKey, appointmentId);
    if (duplicateEntry.error) redirect("/waiting-room?error=save");
    if (duplicateEntry.exists) {
      refreshQueueViews();
      return;
    }
  }
}

export async function setQueueStatus(queueId: string, status: string) {
  const profile = await requireProfile();
  if (!canManageAppointments(profile.role)) redirect("/waiting-room?error=permission");
  if (!QUEUE_STATUSES.has(status as QueueStatus)) redirect("/waiting-room?error=save");

  const dateKey = todayDateKey();
  const supabase = await createClient();
  const { data: entry, error: entryError } = await supabase
    .from("queue")
    .select("status")
    .eq("id", queueId)
    .eq("queue_date", dateKey)
    .maybeSingle<{ status: QueueStatus }>();

  if (entryError || !entry) redirect("/waiting-room?error=save");

  const nextStatus = status as QueueStatus;
  const isAllowedTransition =
    (nextStatus === "llamado" && entry.status === "en_espera") ||
    (nextStatus === "en_atencion" && entry.status === "llamado") ||
    (nextStatus === "atendido" && entry.status === "en_atencion") ||
    (nextStatus === "cancelado" && entry.status !== "atendido" && entry.status !== "cancelado");

  if (!isAllowedTransition) redirect("/waiting-room?error=save");

  const timestamp = new Date().toISOString();
  const values =
    nextStatus === "llamado"
      ? { status: nextStatus, called_at: timestamp }
      : nextStatus === "atendido"
        ? { status: nextStatus, finished_at: timestamp }
        : { status: nextStatus };

  const { error: updateError } = await supabase
    .from("queue")
    .update(values)
    .eq("id", queueId)
    .eq("queue_date", dateKey);

  if (updateError) redirect("/waiting-room?error=save");

  refreshQueueViews();
}