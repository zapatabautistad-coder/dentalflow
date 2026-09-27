import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reportes · DentalFlow" };

const cards = [
  { title: "Ingresos", value: "—", delta: "Sin datos", tone: "emerald" },
  { title: "Citas", value: "—", delta: "Sin datos", tone: "sky" },
  { title: "Pacientes", value: "—", delta: "Sin datos", tone: "violet" },
  { title: "Retención", value: "—", delta: "Sin datos", tone: "amber" },
];

const teamPerformance = [
  { name: "Profesional 1", value: "Sin datos", percent: 0 },
  { name: "Profesional 2", value: "Sin datos", percent: 0 },
  { name: "Profesional 3", value: "Sin datos", percent: 0 },
  { name: "Recepción", value: "Sin datos", percent: 0 },
];

const revenueTrend = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem] font-black tracking-[-0.05em] text-[#0F172A]" data-i18n="sidebar.reports">Reportes</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Indicadores clave</p>
        </div>
        <Link href="/panel" className="glass-button-light px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em]">
          Volver
        </Link>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="glass-card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{card.title}</p>
              <span
                className={`inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] ${
                  card.tone === "emerald"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : card.tone === "sky"
                      ? "border border-sky-200 bg-sky-50 text-sky-700"
                      : card.tone === "violet"
                        ? "border border-violet-200 bg-violet-50 text-violet-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {card.delta}
              </span>
            </div>
            <p className="mt-3 text-[1.6rem] font-black tracking-[-0.06em] text-[#0F172A]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-card p-3.5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-2.5">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Ingresos</p>
              <h2 className="mt-1 text-[1rem] font-black tracking-[-0.04em] text-[#0F172A]">Tendencia</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-emerald-700">
              +14.2%
            </span>
          </div>

          <div className="mt-3 flex h-28 items-end gap-1.5">
            {revenueTrend.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[8px] font-bold text-slate-400">{index + 1}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#0D9488] via-[#06B6D4]/90 to-[#D1FAF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  style={{ height: `${value}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-3.5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-2.5">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Equipo</p>
              <h2 className="mt-1 text-[1rem] font-black tracking-[-0.04em] text-[#0F172A]">Rendimiento</h2>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {teamPerformance.map((member) => (
              <div key={member.name}>
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-700">{member.name}</span>
                  <span className="font-bold text-slate-900">{member.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200/80">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#0D9488] to-[#8FD3C4]"
                    style={{ width: `${member.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
