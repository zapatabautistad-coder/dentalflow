import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Horarios · DentalFlow" };

const schedule = [
  {
    id: "mon",
    day: "Lunes",
    doctor: "Dr. Ramos",
    starts: "08:00",
    ends: "18:00",
    patients: 12,
    status: "activo",
    tint: "emerald",
  },
  {
    id: "tue",
    day: "Martes",
    doctor: "Dra. Ortega",
    starts: "08:00",
    ends: "18:00",
    patients: 14,
    status: "activo",
    tint: "sky",
  },
  {
    id: "wed",
    day: "Miércoles",
    doctor: "Dr. Ramos",
    starts: "09:00",
    ends: "17:00",
    patients: 10,
    status: "parcial",
    tint: "amber",
  },
  {
    id: "thu",
    day: "Jueves",
    doctor: "Dra. León",
    starts: "08:00",
    ends: "18:00",
    patients: 15,
    status: "activo",
    tint: "emerald",
  },
  {
    id: "fri",
    day: "Viernes",
    doctor: "Dr. Ramos",
    starts: "08:00",
    ends: "16:00",
    patients: 9,
    status: "cierre",
    tint: "slate",
  },
];

const quickStats = [
  { label: "Turnos este mes", value: "418" },
  { label: "Promedio por día", value: "14" },
  { label: "Ocupación", value: "86%" },
];

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-i18n="sidebar.schedule">Horarios</h1>
          <p className="mt-1 text-sm text-slate-500">Disponibilidad y agenda semanal del equipo clínico.</p>
        </div>
        <Link href="/appointments/new" className="glass-button">
          + Nueva cita
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
            <p className="mt-4 text-[2rem] font-black tracking-[-0.06em] text-[#0F172A]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {schedule.map((day) => (
          <div key={day.id} className="glass-card p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Horario</p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#0F172A]">{day.day}</h2>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                  day.status === "activo"
                    ? "border-[#0D9488]/20 bg-[#0D9488]/10 text-[#0D9488]"
                    : day.status === "parcial"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                }`}
              >
                {day.status}
              </span>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/40 px-3 py-2.5">
                <span className="font-semibold text-slate-600">Turnos</span>
                <span className="font-bold text-slate-800">{day.starts} — {day.ends}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/40 px-3 py-2.5">
                <span className="font-semibold text-slate-600">Doctor</span>
                <span className="font-bold text-slate-800">{day.doctor}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/40 px-3 py-2.5">
                <span className="font-semibold text-slate-600">Pacientes programados</span>
                <span className="font-bold text-slate-800">{day.patients}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
