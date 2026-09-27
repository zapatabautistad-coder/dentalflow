import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reportes · DentalFlow" };

const cards = [
  { title: "Ingresos", value: "$18.4K", delta: "+12.5%", tone: "emerald" },
  { title: "Citas", value: "246", delta: "+8.1%", tone: "sky" },
  { title: "Pacientes", value: "1.284", delta: "+5.3%", tone: "violet" },
  { title: "Retención", value: "91%", delta: "+2.4%", tone: "amber" },
];

const teamPerformance = [
  { name: "Dr. Ramos", value: "72 citas", percent: 82 },
  { name: "Dra. Ortega", value: "64 citas", percent: 74 },
  { name: "Dra. León", value: "58 citas", percent: 68 },
  { name: "Recepción", value: "91 atenciones", percent: 88 },
];

const revenueTrend = [18, 22, 24, 21, 28, 30, 27, 35, 33, 39, 42, 46];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-i18n="sidebar.reports">Reportes</h1>
          <p className="mt-1 text-sm text-slate-500">Indicadores clave del negocio y rendimiento del equipo.</p>
        </div>
        <Link href="/panel" className="glass-button-light">
          Volver al panel
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="glass-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{card.title}</p>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
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
            <p className="mt-5 text-[2rem] font-black tracking-[-0.06em] text-[#0F172A]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ingresos</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#0F172A]">Tendencia anual</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
              +14.2%
            </span>
          </div>

          <div className="mt-5 flex h-40 items-end gap-2">
            {revenueTrend.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[9px] font-bold text-slate-400">{index + 1}</span>
                <div
                  className="w-full rounded-t-2xl bg-gradient-to-t from-[#0D9488] via-[#06B6D4]/90 to-[#D1FAF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  style={{ height: `${value}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equipo</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#0F172A]">Rendimiento</h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {teamPerformance.map((member) => (
              <div key={member.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{member.name}</span>
                  <span className="font-bold text-slate-900">{member.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/80">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#0D9488] to-[#8FD3C4]"
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
