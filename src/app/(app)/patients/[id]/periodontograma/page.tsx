import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Periodontograma · DentalFlow" };

export default async function PeriodontogramaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  if (!canManagePatients(profile.role)) {
    redirect("/patients");
  }

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, record_number")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const periodontalSummary = [
    { tooth: "11", pocket: 3, mobility: 0, bleeding: "No" },
    { tooth: "12", pocket: 4, mobility: 0, bleeding: "Sí" },
    { tooth: "13", pocket: 3, mobility: 0, bleeding: "No" },
    { tooth: "21", pocket: 5, mobility: 1, bleeding: "Sí" },
    { tooth: "31", pocket: 6, mobility: 1, bleeding: "Sí" },
    { tooth: "41", pocket: 4, mobility: 0, bleeding: "No" },
    { tooth: "46", pocket: 5, mobility: 2, bleeding: "Sí" },
    { tooth: "47", pocket: 4, mobility: 1, bleeding: "No" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Paciente</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{patient.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Expediente {String(patient.record_number ?? "—").padStart(4, "0")}
            </p>
          </div>

          <div className="flex gap-2">
            <a href={`/patients/${id}/odontograma`} className="glass-button-light">
              Odontograma
            </a>
            <a href={`/patients/${id}/plan-tratamiento`} className="glass-button-light">
              Plan de tratamiento
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Periodontograma</h2>
              <p className="text-sm text-slate-500">Evaluación de bolsas periodontales y movilidad.</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Control activo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-3 py-2">Pieza</th>
                  <th className="px-3 py-2">Bolsa</th>
                  <th className="px-3 py-2">Movilidad</th>
                  <th className="px-3 py-2">Sangrado</th>
                </tr>
              </thead>
              <tbody>
                {periodontalSummary.map((item) => (
                  <tr key={item.tooth} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-700">{item.tooth}</td>
                    <td className="px-3 py-3">{item.pocket} mm</td>
                    <td className="px-3 py-3">{item.mobility}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.bleeding === "Sí"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.bleeding}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900">Resumen clínico</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Salud</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">72%</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Sangrado</p>
              <p className="mt-2 text-2xl font-bold text-amber-900">3 zonas</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Seguimiento</p>
              <p className="mt-2 text-sm text-violet-900">Reevaluación programada en 6 semanas.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
