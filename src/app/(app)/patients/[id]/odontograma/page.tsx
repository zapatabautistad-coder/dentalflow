import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";
import { ToothForm } from "./tooth-form";

export const metadata: Metadata = { title: "Odontograma · DentalFlow" };

export default async function OdontogramaPage({
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
    .select("id, full_name, record_number, document_id")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const { data: toothRecord } = await supabase
    .from("odontogram_records")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Paciente
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {patient.full_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Expediente {String(patient.record_number ?? "—").padStart(4, "0")} · {patient.document_id ?? "Sin cédula"}
            </p>
          </div>

          <div className="flex gap-2">
            <a href={`/patients/${id}/periodontograma`} className="glass-button-light">
              Periodontograma
            </a>
            <a href={`/patients/${id}/plan-tratamiento`} className="glass-button-light">
              Plan de tratamiento
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="glass-card p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Odontograma</h2>
              <p className="text-sm text-slate-500">
                Registro clínico por pieza dental.
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {toothRecord ? "Actualizado" : "Sin registro"}
            </span>
          </div>

          <ToothForm patientId={id} initialValue={toothRecord ?? null} />
        </div>

        <aside className="glass-card p-5">
          <h3 className="text-base font-bold text-slate-900">Leyenda</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {[
              { label: "San / sano", tone: "bg-emerald-500" },
              { label: "Caries", tone: "bg-amber-500" },
              { label: "Obturado", tone: "bg-blue-500" },
              { label: "Extracción", tone: "bg-rose-500" },
              { label: "Crown / restauración", tone: "bg-violet-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`h-4 w-4 rounded-full ${item.tone}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Observación
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Se recomienda documentar al menos el diagnóstico principal, la restauración y la presencia de movilidad.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
