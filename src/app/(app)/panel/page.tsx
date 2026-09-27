import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { dayBoundsUtc, formatDateLong, formatHour, todayDateKey } from "@/lib/timezone";
import { StatusChip } from "../appointments/status-chip";

export const metadata: Metadata = { title: "Panel · DentalFlow" };

type AgendaRow = {
  id: string;
  patient_id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

type RecentPatient = {
  id: string;
  full_name: string;
  record_number: number;
  insurance_type: "ars" | "privado" | null;
  insurance_provider: string | null;
};

function insuranceLabel(patient: RecentPatient) {
  if (patient.insurance_type === "ars") return `ARS: ${patient.insurance_provider ?? "—"}`;
  if (patient.insurance_type === "privado") return "Privado";
  return "Sin aseguradora";
}

export default async function PanelPage() {
  const profile = await requireProfile();
  const canManageAgenda = canManageAppointments(profile.role);

  const dateKey = todayDateKey();
  const { start, end } = dayBoundsUtc(dateKey);
  const supabase = await createClient();

  const [patientsCount, agendaResult, waitingCount, recentResult] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("appointments")
      .select("id, patient_id, starts_at, duration_minutes, reason, status, patients(full_name), profiles(full_name)")
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true })
      .returns<AgendaRow[]>(),
    supabase
      .from("queue")
      .select("id", { count: "exact", head: true })
      .eq("queue_date", dateKey)
      .eq("status", "en_espera"),
    supabase
      .from("patients")
      .select("id, full_name, record_number, insurance_type, insurance_provider")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentPatient[]>(),
  ]);

  const agenda = agendaResult.data ?? [];
  const recentPatients = recentResult.data ?? [];
  const activeAgenda = agenda.filter((item) => item.status !== "cancelada");
  const completedToday = agenda.filter((item) => item.status === "completada").length;
  const loadFailed = Boolean(patientsCount.error || agendaResult.error || waitingCount.error || recentResult.error);

  const metrics = [
    { key: "panel.kpi.patients", label: "Pacientes registrados", value: patientsCount.count ?? 0 },
    { key: "panel.kpi.appointments", label: "Citas de hoy", value: activeAgenda.length },
    { key: "panel.kpi.waiting", label: "En sala de espera", value: waitingCount.count ?? 0 },
    { key: "panel.kpi.completed", label: "Completadas hoy", value: completedToday },
  ];

  return (
    <div className="w-full">
      <header className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="panel.title">Panel general</p>
          <h1
            className="mt-1 text-[1.7rem] font-black tracking-[-0.05em] text-[#0F172A]"
            data-i18n-name="panel.welcome"
            data-user-name={profile.fullName}
            suppressHydrationWarning
          >
            Hola, {profile.fullName}
          </h1>
          <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">{formatDateLong(dateKey)}</p>
        </div>

        {canManageAgenda && (
          <Link href="/appointments/new" className="glass-button self-start px-3 py-1.75 text-xs font-bold uppercase tracking-[0.08em] xl:self-auto" data-i18n="panel.newAppointment">
            + nueva cita
          </Link>
        )}
      </header>

      {loadFailed && (
        <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-i18n="panel.loadError">
          No se pudieron cargar algunos datos. Recarga la página.
        </p>
      )}

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="crystal-card rounded-[22px] p-3.5 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.6)]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n={metric.key}>{metric.label}</p>
            <p className="mt-2.5 text-[1.6rem] font-black tracking-[-0.06em] text-[#154360]">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 xl:grid-cols-[1.48fr_0.97fr]">
        <div className="crystal-card rounded-[24px] p-3.5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-2.5">
            <div>
              <h2 className="text-base font-black tracking-[-0.03em] text-[#0F172A]" data-i18n="panel.agenda">Agenda de Hoy</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500" data-i18n="panel.agenda.subtitle">Citas programadas</p>
            </div>
            <Link href="/appointments" className="text-xs font-bold uppercase tracking-[0.08em] text-[#154360] hover:underline" data-i18n="panel.agenda.view">
              Ver todo
            </Link>
          </div>

          {agenda.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500" data-i18n="panel.agenda.empty">No hay citas para hoy.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {agenda.map((item) => {
                const content = (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="min-w-[46px] text-[13px] font-black tracking-[0.08em] text-[#154360]">
                        {formatHour(item.starts_at)}
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-black text-[#0F172A]">{item.patients?.full_name ?? "Paciente"}</p>
                        <p className="mt-0.5 truncate text-[13px] text-slate-500">
                          {item.profiles?.full_name ?? "Sin doctor"}
                          {item.reason ? ` · ${item.reason}` : ""}
                        </p>
                      </div>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                );

                return (
                  <li key={item.id}>
                    <Link
                      href={canManageAgenda ? `/appointments/${item.id}/edit` : `/patients/${item.patient_id}`}
                      className="block rounded-[16px] border border-white/80 bg-white/40 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-[#8FD3C4] hover:bg-white/70"
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="crystal-card rounded-[22px] p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="panel.recent">Pacientes recientes</h3>
            <Link href="/patients" className="text-xs font-black uppercase tracking-[0.08em] text-[#154360] hover:underline" data-i18n="panel.recent.view">
              Ver todos
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500" data-i18n="panel.recent.empty">Aún no hay pacientes registrados.</p>
          ) : (
            <ul className="space-y-2">
              {recentPatients.map((patient) => {
                const content = (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-[#0F172A]">{patient.full_name}</p>
                      <p className="truncate text-xs text-slate-500">{insuranceLabel(patient)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-black tracking-[0.12em] text-[#154360]">
                      N.° {String(patient.record_number).padStart(4, "0")}
                    </span>
                  </>
                );

                return (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/50 px-2.5 py-2 transition hover:border-[#8FD3C4] hover:bg-white/70"
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
