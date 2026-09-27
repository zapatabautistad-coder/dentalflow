import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Horarios · DentalFlow" };

const schedule = [
  {
    id: "mon",
    day: "Día 1",
    doctor: "Profesional",
    starts: "—",
    ends: "—",
    patients: 0,
    status: "sin datos",
    tint: "emerald",
  },
  {
    id: "tue",
    day: "Día 2",
    doctor: "Profesional",
    starts: "—",
    ends: "—",
    patients: 0,
    status: "sin datos",
    tint: "sky",
  },
  {
    id: "wed",
    day: "Día 3",
    doctor: "Profesional",
    starts: "—",
    ends: "—",
    patients: 0,
    status: "sin datos",
    tint: "amber",
  },
  {
    id: "thu",
    day: "Día 4",
    doctor: "Profesional",
    starts: "—",
    ends: "—",
    patients: 0,
    status: "sin datos",
    tint: "emerald",
  },
  {
    id: "fri",
    day: "Día 5",
    doctor: "Profesional",
    starts: "—",
    ends: "—",
    patients: 0,
    status: "sin datos",
    tint: "slate",
  },
];

const quickStats = [
  { label: "Turnos este mes", value: "—" },
  { label: "Promedio por día", value: "—" },
  { label: "Ocupación", value: "—" },
];

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem] font-black tracking-[-0.05em] text-[#0F172A]" data-i18n="sidebar.schedule">Horarios</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Disponibilidad</p>
        </div>
        <Link href="/appointments/new" className="glass-button px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em]">
          + Nueva cita
        </Link>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        {quickStats.map((stat) => (
          <div key={stat.label} className="glass-card p-3.5">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
            <p className="mt-2 text-[1.5rem] font-black tracking-[-0.06em] text-[#0F172A]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {schedule.map((day) => (
          <div key={day.id} className="glass-card p-3.5">
            <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-2.5">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Horario</p>
                <h2 className="mt-1 text-[1rem] font-black tracking-[-0.04em] text-[#0F172A]">{day.day}</h2>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] ${
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

            <div className="mt-3 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center justify-between rounded-[12px] border border-white/80 bg-white/40 px-2.5 py-2">
                <span className="font-semibold text-slate-600">Turnos</span>
                <span className="font-bold text-slate-800">{day.starts} — {day.ends}</span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] border border-white/80 bg-white/40 px-2.5 py-2">
                <span className="font-semibold text-slate-600">Doctor</span>
                <span className="font-bold text-slate-800">{day.doctor}</span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] border border-white/80 bg-white/40 px-2.5 py-2">
                <span className="font-semibold text-slate-600">Pacientes</span>
                <span className="font-bold text-slate-800">{day.patients}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
