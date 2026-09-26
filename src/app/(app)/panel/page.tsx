import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Panel · DentalFlow" };

const TIME_ZONE = "America/Santo_Domingo";

const APPOINTMENT_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  programada: { label: "Programada", tone: "slate" },
  confirmada: { label: "Confirmada", tone: "emerald" },
  en_curso: { label: "En consulta", tone: "indigo" },
  completada: { label: "Completada", tone: "emerald" },
  cancelada: { label: "Cancelada", tone: "rose" },
  no_asistio: { label: "No asistió", tone: "rose" },
};

const QUEUE_STATUS_LABELS: Record<string, string> = {
  en_espera: "En espera",
  llamado: "Llamado",
};

type AppointmentRow = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

type QueueRow = {
  id: string;
  status: string;
  checked_in_at: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

type RecentPatientRow = {
  id: string;
  full_name: string;
  created_at: string;
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function todayDateKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function formatHour(iso: string) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function minutesSince(iso: string, now: Date) {
  const diffMs = now.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

export default async function PanelPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const now = new Date();
  const dateKey = todayDateKey(now);
  const startOfDay = `${dateKey}T00:00:00-04:00`;
  const endOfDay = `${dateKey}T23:59:59.999-04:00`;

  const formattedToday = capitalize(
    new Intl.DateTimeFormat("es-DO", {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(now)
  );

  const [patientsCountRes, appointmentsRes, queueRes, recentPatientsRes] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("id, starts_at, duration_minutes, reason, status, patients(full_name), profiles(full_name)")
      .gte("starts_at", startOfDay)
      .lte("starts_at", endOfDay)
      .order("starts_at", { ascending: true })
      .returns<AppointmentRow[]>(),
    supabase
      .from("queue")
      .select("id, status, checked_in_at, patients(full_name), profiles(full_name)")
      .eq("queue_date", dateKey)
      .eq("status", "en_espera")
      .order("position", { ascending: true })
      .returns<QueueRow[]>(),
    supabase
      .from("patients")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentPatientRow[]>(),
  ]);

  const patientsCount = patientsCountRes.count ?? 0;
  const appointments = appointmentsRes.data ?? [];
  const queue = queueRes.data ?? [];
  const recentPatients = recentPatientsRes.data ?? [];

  const kpis = [
    { label: "Pacientes registrados", value: String(patientsCount), iconBg: "bg-[#154360]/10 text-[#154360]", icon: "P" },
    { label: "Citas de hoy", value: String(appointments.length), iconBg: "bg-[#8FD3C4]/20 text-[#154360]", icon: "C" },
    { label: "En sala de espera", value: String(queue.length), iconBg: "bg-amber-100 text-amber-700", icon: "S" },
  ];

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[30px] border border-white/60 bg-white/80 shadow-[0_16px_40px_rgba(21,67,96,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-gradient-to-r from-[#154360]/5 via-white to-[#8FD3C4]/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#154360]">Panel general</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Bienvenido, {profile.fullName}</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-bold text-slate-700">{formattedToday}</div>
            </div>

            <button
              type="button"
              disabled
              title="Próximamente"
              className="glass-button cursor-not-allowed px-3.5 py-2.5 text-xs opacity-60"
            >
              ＋ Nueva cita
              <span className="ml-2 rounded-full border border-[#8FD3C4]/40 bg-[#8FD3C4]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#154360]">
                Próx.
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3.5 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{kpi.label}</div>
                <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{kpi.value}</div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black shadow-inner shadow-white/50 ${kpi.iconBg}`}>
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Agenda de hoy</h2>
              <p className="text-xs text-slate-500">Citas del día con estado de atención</p>
            </div>
            <button
              type="button"
              disabled
              title="Próximamente"
              className="flex cursor-not-allowed items-center gap-2 text-[11px] font-bold text-slate-400"
            >
              Ver calendario
              <span className="rounded-full border border-[#8FD3C4]/40 bg-[#8FD3C4]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#154360]">
                Próx.
              </span>
            </button>
          </div>

          {appointments.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No hay citas para hoy.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map((item) => {
                const statusInfo = APPOINTMENT_STATUS_LABELS[item.status] ?? { label: item.status, tone: "slate" };
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-center">
                        <div className="text-sm font-black text-slate-900">{formatHour(item.starts_at)}</div>
                        <div className="text-[10px] font-semibold text-slate-400">{item.duration_minutes} min</div>
                      </div>
                      <div className="h-10 w-[2px] rounded-full bg-slate-200" />
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{item.patients?.full_name ?? "Paciente"}</div>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              statusInfo.tone === "emerald"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : statusInfo.tone === "indigo"
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                  : statusInfo.tone === "rose"
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-slate-100 text-slate-700"
                            }`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.reason ?? "Sin motivo registrado"}
                          {item.profiles?.full_name ? (
                            <>
                              {" "}
                              · <span className="font-semibold text-slate-700">{item.profiles.full_name}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Sala de espera</h3>
          {queue.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No hay pacientes en sala de espera.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {queue.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{entry.patients?.full_name ?? "Paciente"}</div>
                    <div className="text-[10px] text-slate-500">{entry.profiles?.full_name ?? QUEUE_STATUS_LABELS[entry.status] ?? entry.status}</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                    {minutesSince(entry.checked_in_at, now)} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Pacientes recientes</h3>
          <Link href="/patients" className="text-[11px] font-bold text-[#154360]">
            Ver todos
          </Link>
        </div>

        {recentPatients.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay pacientes registrados.</p>
        ) : (
          <div className="space-y-3">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="text-sm font-bold text-slate-800">{patient.full_name}</div>
                  <div className="text-[11px] text-slate-500">
                    Registrado el{" "}
                    {new Intl.DateTimeFormat("es-DO", {
                      timeZone: TIME_ZONE,
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(patient.created_at))}
                  </div>
                </div>
                <Link
                  href={`/patients/${patient.id}/edit`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#154360] hover:bg-[#154360]/6 hover:text-[#154360]"
                >
                  Ficha
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
