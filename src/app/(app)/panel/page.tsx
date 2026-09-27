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

const communicationQueue = [
  {
    id: "msg-1",
    channel: "WhatsApp",
    patient: "Paciente",
    title: "Sin mensaje activo",
    time: "—",
    status: "Pendiente",
    tone: "amber",
    href: "",
  },
  {
    id: "msg-2",
    channel: "Email",
    patient: "Paciente",
    title: "Sin correo programado",
    time: "—",
    status: "Sin datos",
    tone: "blue",
    href: "",
  },
  {
    id: "msg-3",
    channel: "Llamada",
    patient: "Paciente",
    title: "Sin seguimiento",
    time: "—",
    status: "Sin datos",
    tone: "emerald",
    href: "",
  },
];

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M20.52 3.48A11.89 11.89 0 0 0 12.03 0C5.47 0 .12 5.35.12 11.91c0 2.1.55 4.14 1.59 5.95L0 24l6.35-1.66A11.9 11.9 0 0 0 12.03 24C18.59 24 24 18.65 24 12.09c0-3.18-1.24-6.18-3.48-8.61ZM12.03 21.82c-1.84 0-3.64-.5-5.21-1.44l-.37-.22-3.77 1 1-3.67-.24-.38A9.87 9.87 0 0 1 2.2 12.1c0-5.45 4.44-9.9 9.83-9.9 2.63 0 5.1 1.02 6.96 2.88A9.81 9.81 0 0 1 21.86 12.1c0 5.45-4.44 9.72-9.83 9.72Zm5.42-7.26c-.3-.15-1.75-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.76.96-.94 1.15-.17.2-.35.22-.65.08-.3-.15-1.26-.47-2.39-1.49-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.47.13-.62l.44-.54c.15-.15.2-.35.3-.58.1-.23.05-.43-.03-.58-.08-.15-.67-1.62-.92-2.23-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.35-.27.28-1.03 1-1.03 2.44 0 1.44 1.05 2.82 1.2 3.02.15.2 2.05 3.13 4.97 4.4.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.11.57-.09 1.75-.71 2-.4.26.3.26.58.17.9-.08.31-1.08 1.65-1.33 2.17-.24.52-.49.46-.84.28-.35-.17-1.3-.53-2.48-1.5-.87-.64-1.46-1.42-1.63-1.66-.17-.25-.14-.39.02-.58.08-.09.18-.25.28-.39.12-.14.15-.24.22-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.76Z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.97.36 1.91.68 2.82a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.26-1.34a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.82.68A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

export default async function PanelPage() {
  const profile = await requireProfile();

  return (
    <div className="min-h-[calc(100dvh-2rem)] w-full">
      <header className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500" data-i18n="panel.title">Panel general</p>
          <h1
            className="mt-1 text-[1.7rem] font-black tracking-[-0.05em] text-[#0F172A]"
            data-i18n-name="panel.welcome"
            data-user-name={profile.fullName}
            suppressHydrationWarning
          >
            Bienvenida
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start xl:self-auto">
          <div className="rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-[9px] font-bold tracking-[0.18em] text-slate-600 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.7)] backdrop-blur-xl" data-i18n="panel.today">
            HOY
          </div>
          <Link href="/appointments/new" className="glass-button px-3 py-1.75 text-[9px] font-bold tracking-[0.14em] uppercase" data-i18n="panel.newAppointment">
            + nueva cita
          </Link>
        </div>
      </header>

      <section className="grid gap-2.5 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="crystal-card rounded-[22px] p-3.5 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.6)]">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500" data-i18n={metric.key}>{metric.label}</p>
                <p className="mt-2.5 text-[1.35rem] font-black tracking-[-0.06em] text-[#0F172A]">{metric.value}</p>
              </div>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${metric.tint}`}>
                {metric.value[0]}
              </span>
            </div>
            <div className="mt-3.5 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#0D9488]">{metric.delta}</span>
              <span className="h-2 w-2 rounded-full bg-[#0D9488] shadow-[0_0_0_4px_rgba(13,148,136,0.12)]" />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 xl:grid-cols-[1.48fr_0.97fr]">
        <div className="crystal-card rounded-[24px] p-3.5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-2.5">
            <div>
              <h2 className="text-[0.94rem] font-black tracking-[-0.03em] text-[#0F172A]" data-i18n="panel.agenda">Agenda de Hoy</h2>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500" data-i18n="panel.agenda.subtitle">Turnos programados</p>
            </div>
            <Link href="/appointments" className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0D9488]" data-i18n="panel.agenda.view">
              Ver todo
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {agenda.map((item) => {
              const badgeClass =
                item.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : item.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-100 text-slate-700";

              return (
                <div key={item.id} className="rounded-[16px] border border-white/80 bg-white/40 p-2.25 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="min-w-[54px] text-left">
                        <div className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-slate-500">{item.time}</div>
                        <div className="mt-1 text-[0.58rem] font-semibold text-slate-400">{item.end}</div>
                      </div>

                      <div className="h-8 w-px bg-slate-200" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[0.84rem] font-black text-[#0F172A]">{item.patient}</p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.14em] ${badgeClass}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">{item.doctor}</p>
                      </div>
                    </div>

                    <button type="button" className="rounded-xl border border-[#0D9488]/20 bg-[#0D9488]/5 px-2 py-1.25 text-[8px] font-black uppercase tracking-[0.18em] text-[#0D9488] transition hover:bg-[#0D9488]/10" data-i18n="panel.agenda.view">
                      Ver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        <div className="space-y-3">
          <div className="crystal-card rounded-[22px] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500" data-i18n="panel.financial">Panel financiero</p>
                <h3 className="mt-1 text-[0.96rem] font-black tracking-[-0.04em] text-[#0F172A]">$184.2K</h3>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-emerald-700">
                +14.2%
              </span>
            </div>

            <div className="mt-3 flex h-18 items-end gap-1.5">
              {financeBars.map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="h-full w-full rounded-t-lg bg-gradient-to-t from-[#0D9488] via-[#06B6D4]/90 to-[#D1FAF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" style={{ height: `${value}%` }} />
                </div>
              ))}
            </div>

            <div className="mt-3 overflow-hidden rounded-[16px] border border-white/80 bg-[#F8FAFC]/80 p-1.5">
              <svg viewBox="0 0 280 80" className="h-14 w-full" preserveAspectRatio="none" aria-label="Revenue line chart">
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

          <div className="crystal-card rounded-[22px] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500" data-i18n="panel.recent">Pacientes recientes</h3>
              <Link href="/patients" className="text-[8px] font-black uppercase tracking-[0.15em] text-[#0D9488]" data-i18n="panel.financial.view">
                Ver todos
              </Link>
            </div>

            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between rounded-lg border border-white/80 bg-white/50 px-2 py-1.75">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${patient.color}`} />
                    <div>
                      <p className="text-[11px] font-bold text-[#0F172A]">{patient.name}</p>
                      <p className="text-[9px] text-slate-500">{patient.status}</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">N</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 xl:grid-cols-[1.32fr_0.68fr]">
        <div className="crystal-card rounded-[22px] p-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Centro de comunicaciones</p>
              <h2 className="mt-1 text-[0.94rem] font-black tracking-[-0.04em] text-[#0F172A]">Mensajería clínica</h2>
            </div>
            <button type="button" className="glass-button px-2.5 py-1.25 text-[7px] font-black uppercase tracking-[0.16em]">
              Nueva campaña
            </button>
          </div>

          <div className="mb-2.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[8px] font-bold text-emerald-700">
              <WhatsAppIcon />
              WhatsApp
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[8px] font-bold text-indigo-700">
              <EmailIcon />
              Email
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-1 text-[8px] font-bold text-slate-700">
              <PhoneIcon />
              Llamada
            </span>
          </div>

          <div className="space-y-2">
            {communicationQueue.map((item) => {
              const channelIcon =
                item.channel === "WhatsApp" ? <WhatsAppIcon /> : item.channel === "Email" ? <EmailIcon /> : <PhoneIcon />;

              const toneClass =
                item.tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : item.tone === "blue"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700";

              return (
                <div key={item.id} className="rounded-[14px] border border-white/80 bg-white/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/80 bg-white/80 text-slate-700">
                        {channelIcon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-[#0F172A]">{item.patient}</p>
                        <p className="truncate text-[9px] text-slate-500">{item.title}</p>
                      </div>
                    </div>

                    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] ${toneClass}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <span>{item.time}</span>
                    <div className="flex items-center gap-2">
                      {item.href ? (
                        <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.75 text-slate-700">
                          {channelIcon}
                          Abrir
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.75 text-slate-500">
                          {channelIcon}
                          Sin acción
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-[20px] p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Resumen</p>
          <div className="mt-2.5 space-y-2">
            <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-[7px] font-black uppercase tracking-[0.16em] text-emerald-700">WhatsApp</p>
              <p className="mt-1 text-lg font-black text-emerald-900">0</p>
            </div>
            <div className="rounded-[12px] border border-indigo-200 bg-indigo-50 p-2">
              <p className="text-[7px] font-black uppercase tracking-[0.16em] text-indigo-700">Email</p>
              <p className="mt-1 text-lg font-black text-indigo-900">0</p>
            </div>
            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-2">
              <p className="text-[7px] font-black uppercase tracking-[0.16em] text-slate-700">Llamadas</p>
              <p className="mt-1 text-lg font-black text-slate-900">0</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
