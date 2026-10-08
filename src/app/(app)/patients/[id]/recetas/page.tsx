import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { MedicationAllergyHistory } from "@/lib/medication-allergy";
import { createPrescription, voidPrescription } from "./actions";
import type { Prescription } from "@/lib/prescriptions";
import { Prescriptions } from "./prescriptions";

export const metadata: Metadata = { title: "Recetas · DentalFlow" };

type Patient = { id: string; full_name: string; record_number: number; archived_at: string | null };

export default async function PrescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, profile] = await Promise.all([params, requireProfile()]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, record_number, archived_at")
    .eq("id", id)
    .maybeSingle<Patient>();
  if (!patient) notFound();

  const isDoctor = profile.role === "doctor";
  const [prescriptionsResult, historyResult, ownProfileResult] = await Promise.all([
    supabase
      .from("prescriptions")
      .select(
        "id, indications, doctor_id, doctor_name, doctor_exequatur, created_at, voided_at, void_reason, prescription_items(id, position, medication, dose, frequency, duration, quantity, instructions)"
      )
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Prescription[]>(),
    supabase
      .from("patient_medical_history")
      .select("allergy_penicillin, allergy_nsaids, allergy_local_anesthetic, allergies_other")
      .eq("patient_id", id)
      .maybeSingle<MedicationAllergyHistory>(),
    isDoctor
      ? supabase.from("profiles").select("exequatur").eq("id", profile.userId).maybeSingle<{ exequatur: string | null }>()
      : Promise.resolve({ data: null }),
  ]);

  const canWrite = isDoctor && !patient.archived_at;
  const hasExequatur = Boolean(ownProfileResult.data?.exequatur?.trim());

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Link href={`/patients/${patient.id}`} className="self-start text-sm font-semibold text-[#0766B5] hover:underline">
        ← {patient.full_name}
      </Link>

      <header>
        <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="rx.title">Recetas</h1>
        <p className="mt-1 text-sm text-slate-600">
          <span data-i18n="chart.recordNo">Expediente N.°</span> {String(patient.record_number).padStart(4, "0")} ·{" "}
          <span data-i18n="rx.subtitle">Nada se borra: una receta se anula con motivo.</span>
        </p>
      </header>

      {prescriptionsResult.error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="rx.loadError">
          No se pudieron cargar las recetas. Recarga la página.
        </p>
      ) : (
        <Prescriptions
          patientId={patient.id}
          prescriptions={prescriptionsResult.data ?? []}
          currentUserId={profile.userId}
          canWrite={canWrite}
          hasExequatur={hasExequatur}
          history={historyResult.error ? null : historyResult.data ?? null}
          createAction={createPrescription.bind(null, patient.id)}
          voidAction={voidPrescription.bind(null, patient.id)}
        />
      )}
    </div>
  );
}
