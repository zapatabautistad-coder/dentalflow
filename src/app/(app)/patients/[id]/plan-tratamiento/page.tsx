import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canWriteOdontogram, canWriteTreatmentPlan, requireProfile } from "@/lib/auth";
import { addPlanItem, movePlanItem } from "./actions";
import { TreatmentPlan, type PlanItem } from "./treatment-plan";

export const metadata: Metadata = { title: "Plan de tratamiento · DentalFlow" };

type Patient = { id: string; full_name: string; record_number: number; archived_at: string | null };

export default async function TreatmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, profile] = await Promise.all([params, requireProfile()]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, record_number, archived_at")
    .eq("id", id)
    .maybeSingle<Patient>();
  if (!patient) notFound();

  const { data, error } = await supabase
    .from("treatment_plan_items")
    .select(
      "id, tooth, surfaces, procedure, estimated_cost, note, status, cancel_reason, created_at, completed_at, cancelled_at, creator:profiles!treatment_plan_items_created_by_fkey(full_name), completer:profiles!treatment_plan_items_completed_by_fkey(full_name)"
    )
    .eq("patient_id", id)
    .order("created_at", { ascending: true })
    .limit(500)
    .returns<PlanItem[]>();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Link href={`/patients/${patient.id}`} className="self-start text-sm font-semibold text-[#0766B5] hover:underline">
        ← {patient.full_name}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="plan.title">Plan de tratamiento</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span data-i18n="chart.recordNo">Expediente N.°</span> {String(patient.record_number).padStart(4, "0")} ·{" "}
            <span data-i18n="plan.subtitle">Nada se borra: un procedimiento se cancela con motivo.</span>
          </p>
        </div>
        <Link href={`/patients/${patient.id}/odontograma`} className="glass-button-light min-h-11 text-[15px]" data-i18n="odontogram.title">
          Odontograma
        </Link>
      </header>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="plan.loadError">
          No se pudo cargar el plan de tratamiento. Recarga la página.
        </p>
      ) : (
        <TreatmentPlan
          patientId={patient.id}
          items={data ?? []}
          canWrite={canWriteTreatmentPlan(profile.role) && !patient.archived_at}
          canWriteOdontogram={canWriteOdontogram(profile.role) && !patient.archived_at}
          addAction={addPlanItem.bind(null, patient.id)}
          moveAction={movePlanItem}
        />
      )}
    </div>
  );
}
