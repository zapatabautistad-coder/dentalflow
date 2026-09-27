import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Plan de tratamiento · DentalFlow" };

export default async function TreatmentPlanPage({
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

  const plan = [
    {
      id: "TR-101",
      title: "Limpieza profesional + profilaxis",
      teeth: "11, 12, 21, 31",
      status: "Pendiente",
      priority: "Alta",
      amount: "$1,250.00",
      notes: "Control de placa y cálculo supragingival.",
    },
    {
      id: "TR-204",
      title: "Resina en premolar superior",
      teeth: "24",
      status: "En curso",
      priority: "Media",
      amount: "$2,800.00",
      notes: "Restauración estética en cara vestibular.",
    },
    {
      id: "TR-308",
      title: "Exodoncia de molar inferior",
      teeth: "46",
      status: "Programado",
      priority: "Alta",
      amount: "$4,500.00",
      notes: "Se recomienda control postoperatorio en 7 días.",
    },
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
            <a href={`/patients/${id}/periodontograma`} className="glass-button-light">
              Periodontograma
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="glass-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Plan de tratamiento</h2>
              <p className="text-sm text-slate-500">Secuencia de procedimientos y costos estimados.</p>
            </div>
            <button type="button" className="glass-button">
              + Nuevo procedimiento
            </button>
          </div>

          <div className="space-y-4">
            {plan.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                        {item.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                          item.status === "En curso"
                            ? "bg-blue-100 text-blue-700"
                            : item.status === "Programado"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Prioridad</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{item.priority}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Piezas</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{item.teeth}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Monto</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{item.amount}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Siguimiento</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">7 días</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600">{item.notes}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900">Presupuesto global</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Total estimado</p>
              <p className="mt-2 text-3xl font-bold">$8,550.00</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Pagado</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">$2,250.00</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Restante</p>
              <p className="mt-2 text-2xl font-bold text-amber-900">$6,300.00</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
