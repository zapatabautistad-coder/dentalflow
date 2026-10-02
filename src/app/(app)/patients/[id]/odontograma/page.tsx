import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canWriteOdontogram, requireProfile } from "@/lib/auth";
import { addOdontogramEntry, voidOdontogramEntry } from "./actions";
import { OdontogramChart, type ChartEntry } from "./odontogram-chart";

export const metadata: Metadata = { title: "Odontograma · DentalFlow" };

type Patient = { id: string; full_name: string; record_number: number; archived_at: string | null };

export default async function OdontogramPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, profile] = await Promise.all([params, requireProfile()]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, record_number, archived_at")
    .eq("id", id)
    .maybeSingle<Patient>();

  if (!patient) notFound();

  const { data, error } = await supabase
    .from("odontogram_entries")
    .select("id, tooth, surfaces, condition, note, corrects_entry_id, correction_reason, created_at, author_role, profiles(full_name)")
    .eq("patient_id", id)
    .order("created_at", { ascending: true })
    .limit(2000)
    .returns<ChartEntry[]>();

  const canWrite = canWriteOdontogram(profile.role) && !patient.archived_at;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Link href={`/patients/${patient.id}`} className="self-start text-sm font-semibold text-[#0766B5] hover:underline">
        ← {patient.full_name}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="odontogram.title">Odontograma</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span data-i18n="chart.recordNo">Expediente N.°</span> {String(patient.record_number).padStart(4, "0")} ·{" "}
            <span data-i18n="odontogram.subtitle">
              Cada hallazgo queda firmado con fecha y hora. No se borra: un error se anula con motivo.
            </span>
          </p>
        </div>
        <Link href={`/patients/${patient.id}/plan-tratamiento`} className="glass-button-light min-h-11 text-[15px]" data-i18n="plan.title">
          Plan de tratamiento
        </Link>
      </header>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="odontogram.loadError">
          No se pudo cargar el odontograma. Recarga la página.
        </p>
      ) : (
        <OdontogramChart
          patientId={patient.id}
          entries={data ?? []}
          canWrite={canWrite}
          addAction={addOdontogramEntry.bind(null, patient.id)}
          voidAction={voidOdontogramEntry}
        />
      )}
    </div>
  );
}
