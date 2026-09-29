"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { dayBoundsUtc, todayDateKey } from "@/lib/timezone";

export type NotificationKind =
  | "appointmentSoon"
  | "queueWaiting"
  | "appointmentUnconfirmed"
  | "missingHistory";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  patientName: string;
  href: string;
  startsAt?: string;
};

export type NotificationsResult = {
  items: NotificationItem[];
  error: boolean;
};

type TodayAppointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  starts_at: string;
  status: string;
  patients: { full_name: string } | null;
};

type WaitingQueueEntry = {
  id: string;
  patient_id: string;
  position: number;
  patients: { full_name: string } | null;
};

export async function getNotifications(): Promise<NotificationsResult> {
  const profile = await requireProfile();
  const dateKey = todayDateKey();
  const { start, end } = dayBoundsUtc(dateKey);
  const now = new Date();
  const nowMs = now.getTime();
  const soonUntil = new Date(nowMs + 30 * 60_000).toISOString();
  const supabase = await createClient();

  const [appointmentsResult, queueResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, starts_at, status, patients(full_name)")
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true })
      .returns<TodayAppointment[]>(),
    (() => {
      let query = supabase
        .from("queue")
        .select("id, patient_id, position, patients(full_name)")
        .eq("queue_date", dateKey)
        .eq("status", "en_espera")
        .order("position", { ascending: true });
      if (profile.role === "doctor") query = query.eq("doctor_id", profile.userId);
      return query.returns<WaitingQueueEntry[]>();
    })(),
  ]);

  if (appointmentsResult.error || queueResult.error) return { items: [], error: true };

  const appointments = appointmentsResult.data ?? [];
  const waitingEntries = queueResult.data ?? [];
  const items: NotificationItem[] = [];

  if (profile.role === "doctor") {
    for (const appointment of appointments) {
      const startMs = new Date(appointment.starts_at).getTime();
      const isActive = appointment.status === "programada" || appointment.status === "confirmada";
      if (
        appointment.doctor_id !== profile.userId ||
        !isActive ||
        startMs < nowMs ||
        startMs > new Date(soonUntil).getTime() ||
        !appointment.patients
      ) {
        continue;
      }
      items.push({
        id: `appointment:${appointment.id}`,
        kind: "appointmentSoon",
        patientName: appointment.patients.full_name,
        href: `/appointments/${appointment.id}/edit`,
        startsAt: appointment.starts_at,
      });
    }
  } else if (profile.role === "admin" || profile.role === "recepcion") {
    for (const appointment of appointments) {
      if (appointment.status !== "programada" || !appointment.patients) continue;
      items.push({
        id: `appointment:${appointment.id}`,
        kind: "appointmentUnconfirmed",
        patientName: appointment.patients.full_name,
        href: `/appointments/${appointment.id}/edit`,
        startsAt: appointment.starts_at,
      });
    }
  }

  for (const entry of waitingEntries) {
    if (!entry.patients) continue;
    items.push({
      id: `queue:${entry.id}`,
      kind: "queueWaiting",
      patientName: entry.patients.full_name,
      href: "/waiting-room",
    });
  }

  const patientsWithAppointments = new Map<string, string>();
  for (const appointment of appointments) {
    if (appointment.status === "cancelada" || !appointment.patients) continue;
    // El doctor solo recibe avisos de sus propios pacientes del día.
    if (profile.role === "doctor" && appointment.doctor_id !== profile.userId) continue;
    patientsWithAppointments.set(appointment.patient_id, appointment.patients.full_name);
  }

  const patientIds = Array.from(patientsWithAppointments.keys());
  const existingHistoryIds = new Set<string>();
  for (let offset = 0; offset < patientIds.length; offset += 100) {
    const batch = patientIds.slice(offset, offset + 100);
    const { data, error } = await supabase
      .from("patient_medical_history")
      .select("patient_id")
      .in("patient_id", batch);

    if (error) return { items: [], error: true };
    for (const history of data ?? []) existingHistoryIds.add(history.patient_id);
  }

  for (const [patientId, patientName] of patientsWithAppointments) {
    if (existingHistoryIds.has(patientId)) continue;
    items.push({
      id: `history:${patientId}`,
      kind: "missingHistory",
      patientName,
      href: `/patients/${patientId}`,
    });
  }

  return { items, error: false };
}