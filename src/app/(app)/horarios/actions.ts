"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isValidDateKey, todayDateKey } from "@/lib/timezone";

type ActionContext =
  | { ok: true; doctorId: string; dayKey: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; dayKey: string; error?: string; errorKey?: string };

function value(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function redirectToSchedule(
  formData: FormData,
  feedback?: { error?: string; errorKey?: string }
): never {
  const params = new URLSearchParams();
  const doctorId = value(formData, "doctor_id");
  const day = value(formData, "day");

  if (doctorId) params.set("doctor", doctorId);
  params.set("day", isValidDateKey(day) ? day : todayDateKey());
  if (feedback?.error) params.set("error", feedback.error);
  if (feedback?.errorKey) params.set("errorKey", feedback.errorKey);

  redirect(`/horarios?${params.toString()}`);
}

async function getActionContext(formData: FormData): Promise<ActionContext> {
  const profile = await requireProfile();
  const dayValue = value(formData, "day");
  const dayKey = isValidDateKey(dayValue) ? dayValue : todayDateKey();

  if (profile.role !== "admin" && profile.role !== "recepcion" && profile.role !== "doctor") {
    redirect("/panel");
  }

  const supabase = await createClient();
  if (profile.role === "doctor") {
    return { ok: true, doctorId: profile.userId, dayKey, supabase };
  }

  const doctorId = value(formData, "doctor_id");
  if (!doctorId) return { ok: false, dayKey, errorKey: "schedule.error.doctorRequired" };

  const { data: doctor, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", doctorId)
    .eq("role", "doctor")
    .eq("active", true)
    .maybeSingle();

  if (error) return { ok: false, dayKey, error: error.message };
  if (!doctor) return { ok: false, dayKey, errorKey: "schedule.error.doctorInvalid" };

  return { ok: true, doctorId, dayKey, supabase };
}

function finishSuccess(doctorId: string, dayKey: string): never {
  revalidatePath("/horarios");
  redirect(`/horarios?doctor=${encodeURIComponent(doctorId)}&day=${encodeURIComponent(dayKey)}`);
}

export async function addScheduleBlock(formData: FormData) {
  const context = await getActionContext(formData);
  if (!context.ok) redirectToSchedule(formData, context);

  const weekday = Number(value(formData, "weekday"));
  const startTime = value(formData, "start_time");
  const endTime = value(formData, "end_time");
  if (
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    startTime >= endTime
  ) {
    redirectToSchedule(formData, { errorKey: "schedule.error.blockInvalid" });
  }

  const { error } = await context.supabase.from("doctor_schedules").insert({
    doctor_id: context.doctorId,
    weekday,
    start_time: startTime,
    end_time: endTime,
    active: true,
  });

  if (error) redirectToSchedule(formData, { error: error.message });
  finishSuccess(context.doctorId, context.dayKey);
}

export async function deactivateScheduleBlock(formData: FormData) {
  const context = await getActionContext(formData);
  if (!context.ok) redirectToSchedule(formData, context);

  const scheduleId = value(formData, "schedule_id");
  if (!scheduleId) redirectToSchedule(formData, { errorKey: "schedule.error.blockNotFound" });

  const { data, error } = await context.supabase
    .from("doctor_schedules")
    .update({ active: false })
    .eq("id", scheduleId)
    .eq("doctor_id", context.doctorId)
    .eq("active", true)
    .select("id")
    .maybeSingle();

  if (error) redirectToSchedule(formData, { error: error.message });
  if (!data) redirectToSchedule(formData, { errorKey: "schedule.error.blockNotFound" });
  finishSuccess(context.doctorId, context.dayKey);
}

export async function addTimeOff(formData: FormData) {
  const context = await getActionContext(formData);
  if (!context.ok) redirectToSchedule(formData, context);

  const startsOn = value(formData, "starts_on");
  const endsOn = value(formData, "ends_on");
  const reason = value(formData, "reason");
  if (!isValidDateKey(startsOn) || !isValidDateKey(endsOn) || startsOn > endsOn || !reason) {
    redirectToSchedule(formData, { errorKey: "schedule.error.timeOffInvalid" });
  }

  const { error } = await context.supabase.from("doctor_time_off").insert({
    doctor_id: context.doctorId,
    starts_on: startsOn,
    ends_on: endsOn,
    reason,
  });

  if (error) redirectToSchedule(formData, { error: error.message });
  finishSuccess(context.doctorId, context.dayKey);
}

export async function voidTimeOff(formData: FormData) {
  const context = await getActionContext(formData);
  if (!context.ok) redirectToSchedule(formData, context);

  const timeOffId = value(formData, "time_off_id");
  const voidReason = value(formData, "void_reason");
  if (!timeOffId || !voidReason) {
    redirectToSchedule(formData, { errorKey: "schedule.error.voidReasonRequired" });
  }

  const { data, error } = await context.supabase
    .from("doctor_time_off")
    .update({ void_reason: voidReason })
    .eq("id", timeOffId)
    .eq("doctor_id", context.doctorId)
    .is("voided_at", null)
    .select("id")
    .maybeSingle();

  if (error) redirectToSchedule(formData, { error: error.message });
  if (!data) redirectToSchedule(formData, { errorKey: "schedule.error.timeOffNotFound" });
  finishSuccess(context.doctorId, context.dayKey);
}