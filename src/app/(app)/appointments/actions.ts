"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { combineDateTime, isValidDateKey, splitLocalDateTime } from "@/lib/timezone";
import { buildPatientSearchFilter } from "@/lib/patient-search";
import { DOCTOR_ALLOWED_STATUSES, DURATION_OPTIONS, type AppointmentStatus } from "./status";

export type SubmittedAppointmentValues = {
  doctor_id: string;
  date: string;
  time: string;
  duration_minutes: string;
  reason: string;
  status?: string;
};

export type AppointmentFormState =
  | { error: string; values?: SubmittedAppointmentValues; attemptId?: string }
  | undefined;

export type PatientResult = {
  id: string;
  full_name: string;
  document_id: string | null;
};

type ParsedAppointment =
  | { ok: true; values: AppointmentValues; submitted: SubmittedAppointmentValues }
  | { ok: false; error: string; submitted: SubmittedAppointmentValues };

type AppointmentValues = {
  patient_id: string;
  doctor_id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string | null;
  dateKey: string;
};

const STATUS_VALUES = new Set<string>([
  "programada",
  "confirmada",
  "en_curso",
  "completada",
  "cancelada",
  "no_asistio",
]);

// Valores tal como los envió el usuario, para poder re-mostrarlos en el
// formulario si el servidor devuelve un error.
function extractSubmittedValues(formData: FormData): SubmittedAppointmentValues {
  return {
    doctor_id: String(formData.get("doctor_id") ?? "").trim(),
    date: String(formData.get("date") ?? "").trim(),
    time: String(formData.get("time") ?? "").trim(),
    duration_minutes: String(formData.get("duration_minutes") ?? "").trim(),
    reason: String(formData.get("reason") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
  };
}

function parseAppointmentForm(formData: FormData): ParsedAppointment {
  const submitted = extractSubmittedValues(formData);
  const patientId = String(formData.get("patient_id") ?? "").trim();
  const doctorId = submitted.doctor_id;
  const dateKey = submitted.date;
  const time = submitted.time;
  const durationMinutes = Number(submitted.duration_minutes);
  const reason = submitted.reason;

  if (!patientId) return { ok: false, error: "Selecciona un paciente.", submitted };
  if (!doctorId) return { ok: false, error: "Selecciona un doctor.", submitted };
  if (!isValidDateKey(dateKey)) return { ok: false, error: "Selecciona una fecha válida.", submitted };
  if (!/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "Selecciona una hora válida.", submitted };
  if (!DURATION_OPTIONS.includes(durationMinutes as (typeof DURATION_OPTIONS)[number])) {
    return { ok: false, error: "Selecciona una duración válida.", submitted };
  }

  return {
    ok: true,
    submitted,
    values: {
      patient_id: patientId,
      doctor_id: doctorId,
      starts_at: combineDateTime(dateKey, time),
      duration_minutes: durationMinutes,
      reason: reason || null,
      dateKey,
    },
  };
}

// Busca citas del mismo doctor que se crucen con el horario propuesto,
// ignorando las canceladas y (en edición) la propia cita.
async function hasOverlap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
  startsAtIso: string,
  durationMinutes: number,
  excludeId?: string
): Promise<boolean> {
  const newStart = new Date(startsAtIso).getTime();
  const newEnd = newStart + durationMinutes * 60000;
  const lowerBoundIso = new Date(newStart - 24 * 60 * 60000).toISOString();
  const upperBoundIso = new Date(newEnd).toISOString();

  let query = supabase
    .from("appointments")
    .select("id, starts_at, duration_minutes")
    .eq("doctor_id", doctorId)
    .neq("status", "cancelada")
    .gt("starts_at", lowerBoundIso)
    .lt("starts_at", upperBoundIso);

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.returns<{ id: string; starts_at: string; duration_minutes: number }[]>();
  if (!data) return false;

  return data.some((appointment) => {
    const existingStart = new Date(appointment.starts_at).getTime();
    const existingEnd = existingStart + appointment.duration_minutes * 60000;
    return newStart < existingEnd && existingStart < newEnd;
  });
}

export async function searchPatients(rawQuery: string): Promise<PatientResult[]> {
  const profile = await requireProfile();
  if (!canManageAppointments(profile.role)) return [];

  const searchFilter = buildPatientSearchFilter(rawQuery);
  if (!searchFilter) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, full_name, document_id")
    .is("archived_at", null)
    .or(searchFilter)
    .order("full_name", { ascending: true })
    .limit(8)
    .returns<PatientResult[]>();

  return data ?? [];
}

export async function createAppointment(
  _prev: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const profile = await requireProfile();
  if (!canManageAppointments(profile.role)) {
    return { error: "No tienes permiso para crear citas." };
  }

  const parsed = parseAppointmentForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.submitted, attemptId: randomUUID() };

  const supabase = await createClient();

  if (await hasOverlap(supabase, parsed.values.doctor_id, parsed.values.starts_at, parsed.values.duration_minutes)) {
    return { error: "El doctor ya tiene otra cita en ese horario.", values: parsed.submitted, attemptId: randomUUID() };
  }

  const { error } = await supabase.from("appointments").insert({
    patient_id: parsed.values.patient_id,
    doctor_id: parsed.values.doctor_id,
    starts_at: parsed.values.starts_at,
    duration_minutes: parsed.values.duration_minutes,
    reason: parsed.values.reason,
  });

  if (error) {
    return { error: "No se pudo guardar la cita. Inténtalo de nuevo.", values: parsed.submitted, attemptId: randomUUID() };
  }

  revalidatePath("/appointments");
  redirect(`/appointments?date=${parsed.values.dateKey}`);
}

export async function updateAppointment(
  appointmentId: string,
  _prev: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const profile = await requireProfile();
  if (!canManageAppointments(profile.role)) {
    return { error: "No tienes permiso para editar citas." };
  }

  const parsed = parseAppointmentForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.submitted, attemptId: randomUUID() };

  const status = parsed.submitted.status ?? "";
  if (!STATUS_VALUES.has(status)) {
    return { error: "Selecciona un estado válido.", values: parsed.submitted, attemptId: randomUUID() };
  }

  const supabase = await createClient();

  if (
    await hasOverlap(
      supabase,
      parsed.values.doctor_id,
      parsed.values.starts_at,
      parsed.values.duration_minutes,
      appointmentId
    )
  ) {
    return { error: "El doctor ya tiene otra cita en ese horario.", values: parsed.submitted, attemptId: randomUUID() };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      patient_id: parsed.values.patient_id,
      doctor_id: parsed.values.doctor_id,
      starts_at: parsed.values.starts_at,
      duration_minutes: parsed.values.duration_minutes,
      reason: parsed.values.reason,
      status,
    })
    .eq("id", appointmentId);

  if (error) {
    return { error: "No se pudo actualizar la cita. Inténtalo de nuevo.", values: parsed.submitted, attemptId: randomUUID() };
  }

  revalidatePath("/appointments");
  redirect(`/appointments?date=${parsed.values.dateKey}`);
}

export async function updateAppointmentStatus(
  appointmentId: string,
  _prev: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const profile = await requireProfile();
  const status = String(formData.get("status") ?? "").trim() as AppointmentStatus;

  if (!STATUS_VALUES.has(status)) {
    return { error: "Selecciona un estado válido." };
  }

  if (!canManageAppointments(profile.role)) {
    // El doctor solo cambia el estado de sus propias citas y no puede
    // cancelar (reforzado también por el trigger de la migración 003).
    if (profile.role !== "doctor") {
      return { error: "No tienes permiso para cambiar el estado de esta cita." };
    }
    if (!DOCTOR_ALLOWED_STATUSES.includes(status)) {
      return { error: "No tienes permiso para dejar la cita en ese estado." };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .select("starts_at")
    .single<{ starts_at: string }>();

  if (error || !data) {
    return { error: "No se pudo actualizar el estado. Inténtalo de nuevo." };
  }

  revalidatePath("/appointments");
  redirect(`/appointments?date=${splitLocalDateTime(data.starts_at).dateKey}`);
}
