import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { dayBoundsUtc, formatDateLong, formatHour, isValidDateKey, todayDateKey } from "@/lib/timezone";
import { DayNav } from "./day-nav";
import { StatusChip } from "./status-chip";

export const metadata: Metadata = { title: "Citas · DentalFlow" };

type AppointmentRow = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const profile = await requireProfile();
  const canManage = canManageAppointments(profile.role);

  const dateKey = date && isValidDateKey(date) ? date : todayDateKey();
  const { start, end } = dayBoundsUtc(dateKey);

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, duration_minutes, reason, status, patients(full_name), profiles(full_name)")
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true })
    .returns<AppointmentRow[]>();

  const appointments = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-i18n="appointments.title">Citas</h1>
          <p className="mt-1 text-sm text-slate-500">{formatDateLong(dateKey)}</p>
        </div>
        {canManage && (
          <Link href={`/appointments/new?date=${dateKey}`} className="glass-button" data-i18n="appointments.new">
            + Nueva cita
          </Link>
        )}
      </div>

      <div className="crystal-card flex flex-wrap items-center justify-between gap-4 rounded-3xl p-4">
        <DayNav dateKey={dateKey} />
      </div>

      <div className="crystal-card overflow-hidden rounded-3xl">
        {appointments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500" data-i18n="appointments.empty">
            No hay citas para este día.
          </p>
        ) : (
          <div className="divide-y divide-white/70">
            {appointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/appointments/${appointment.id}/edit`}
                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 shrink-0 text-center">
                    <div className="text-sm font-black text-slate-900">{formatHour(appointment.starts_at)}</div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {appointment.duration_minutes} min
                    </div>
                  </div>
                  <div className="hidden h-10 w-[2px] rounded-full bg-slate-200 sm:block" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-900" data-i18n="appointments.patientFallback">
                        {appointment.patients?.full_name ?? "Paciente"}
                      </div>
                      <StatusChip status={appointment.status} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      <span data-i18n="appointments.reasonMissing">{appointment.reason ?? "Sin motivo registrado"}</span>
                      {appointment.profiles?.full_name ? (
                        <>
                          {" "}
                          · <span className="font-semibold text-slate-700" data-i18n="appointments.doctor">{appointment.profiles.full_name}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
