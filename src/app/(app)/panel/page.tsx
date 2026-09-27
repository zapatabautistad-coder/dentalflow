import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Panel · DentalFlow" };

const metrics = [
  { key: "panel.kpi.patients", label: "Pacientes registrados", value: "0", delta: "Sin registros", tint: "bg-[#0D9488]/10 text-[#0D9488]" },
  { key: "panel.kpi.appointments", label: "Citas de hoy", value: "0", delta: "Sin agenda", tint: "bg-[#06B6D4]/10 text-[#0F172A]" },
  { key: "panel.kpi.waiting", label: "En sala de espera", value: "0", delta: "Sin pacientes", tint: "bg-[#F59E0B]/10 text-[#B45309]" },
  { key: "panel.kpi.plans", label: "Planes activos", value: "0", delta: "Sin planes", tint: "bg-[#8FD3C4]/20 text-[#154360]" },
];

const agenda = [
  { id: "slot-1", time: "--:--", end: "--:--", patient: "Paciente", doctor: "Doctor", status: "Pendiente", tone: "slate" },
  { id: "slot-2", time: "--:--", end: "--:--", patient: "Paciente", doctor: "Doctor", status: "Sin asignar", tone: "amber" },
  { id: "slot-3", time: "--:--", end: "--:--", patient: "Paciente", doctor: "Doctor", status: "Pendiente", tone: "slate" },
];

const financeBars = [16, 20, 18, 22, 19, 25, 21, 24, 23, 20, 18, 22];

const recentPatients = [
  { id: "patient-1", name: "Paciente", status: "Sin registro", color: "bg-emerald-500" },
  { id: "patient-2", name: "Paciente", status: "Sin registro", color: "bg-sky-500" },
  { id: "patient-3", name: "Paciente", status: "Sin registro", color: "bg-amber-500" },
  { id: "patient-4", name: "Paciente", status: "Sin registro", color: "bg-violet-500" },
];

export default async function PanelPage() {
  const profile = await requireProfile();

  return (
    <div className="min-h-[calc(100dvh-2rem)] w-full">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500" data-i18n="panel.title">Panel general</p>
          <h1 className="mt-2 text-[2.25rem] font-black tracking-[-0.06em] text-[#0F172A]" data-i18n-name="panel.welcome" data-user-name={profile.fullName}>Bienvenida, {profile.fullName}</h1>
        </div>

        <div className="flex items-center gap-3 self-start xl:self-auto">
          <div className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-[11px] font-bold tracking-[0.18em] text-slate-600 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.7)] backdrop-blur-xl" data-i18n="panel.today">
            HOY
          </div>
          <Link href="/appointments/new" className="glass-button px-4 py-2.5 text-xs font-bold tracking-[0.14em] uppercase" data-i18n="panel.newAppointment">
            + nueva cita
          </Link>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="crystal-card rounded-[28px] p-5 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500" data-i18n={metric.key}>{metric.label}</p>
                <p className="mt-4 text-[2rem] font-black tracking-[-0.06em] text-[#0F172A]">{metric.value}</p>
              </div>
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${metric.tint}`}>
                {metric.value[0]}
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0D9488]">{metric.delta}</span>
              <span className="h-2 w-2 rounded-full bg-[#0D9488] shadow-[0_0_0_4px_rgba(13,148,136,0.12)]" />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="crystal-card rounded-[30px] p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-4">
            <div>
              <h2 className="text-[1.05rem] font-black tracking-[-0.03em] text-[#0F172A]" data-i18n="panel.agenda">Agenda de Hoy</h2>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500" data-i18n="panel.agenda.subtitle">Turnos programados</p>
            </div>
            <Link href="/appointments" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0D9488]" data-i18n="panel.agenda.view">
              Ver todo
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {agenda.map((item) => {
              const badgeClass =
                item.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : item.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-100 text-slate-700";

              return (
                <div key={item.id} className="rounded-[22px] border border-white/80 bg-white/40 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="min-w-[68px] text-left">
                        <div className="text-[0.74rem] font-black uppercase tracking-[0.18em] text-slate-500">{item.time}</div>
                        <div className="mt-1 text-[0.68rem] font-semibold text-slate-400">{item.end}</div>
                      </div>

                      <div className="h-12 w-px bg-slate-200" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[1rem] font-black text-[#0F172A]">{item.patient}</p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${badgeClass}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{item.doctor}</p>
                      </div>
                    </div>

                    <button type="button" className="rounded-xl border border-[#0D9488]/20 bg-[#0D9488]/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#0D9488] transition hover:bg-[#0D9488]/10" data-i18n="panel.agenda.view">
                      Ver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" className="glass-button px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em]" data-i18n="panel.agenda.new">
              + nueva cita
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="crystal-card rounded-[30px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500" data-i18n="panel.financial">Panel financiero</p>
                <h3 className="mt-2 text-[1.2rem] font-black tracking-[-0.04em] text-[#0F172A]">$184.2K</h3>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                +14.2%
              </span>
            </div>

            <div className="mt-5 flex h-28 items-end gap-2">
              {financeBars.map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="h-full w-full rounded-t-2xl bg-gradient-to-t from-[#0D9488] via-[#06B6D4]/90 to-[#D1FAF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" style={{ height: `${value}%` }} />
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-[22px] border border-white/80 bg-[#F8FAFC]/80 p-3">
              <svg viewBox="0 0 280 80" className="h-20 w-full" preserveAspectRatio="none" aria-label="Revenue line chart">
                <defs>
                  <linearGradient id="areaFill" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(13,148,136,0.28)" />
                    <stop offset="100%" stopColor="rgba(13,148,136,0.02)" />
                  </linearGradient>
                </defs>
                <path d="M0 62 C34 60, 48 48, 74 54 S120 34, 142 41 S182 28, 206 36 S240 20, 280 16 L280 80 L0 80 Z" fill="url(#areaFill)" />
                <path d="M0 62 C34 60, 48 48, 74 54 S120 34, 142 41 S182 28, 206 36 S240 20, 280 16" fill="none" stroke="#0D9488" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="crystal-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500" data-i18n="panel.recent">Pacientes recientes</h3>
              <Link href="/patients" className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0D9488]" data-i18n="panel.financial.view">
                Ver todos
              </Link>
            </div>

            <div className="space-y-3">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${patient.color}`} />
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{patient.name}</p>
                      <p className="text-[11px] text-slate-500">{patient.status}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">N</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
