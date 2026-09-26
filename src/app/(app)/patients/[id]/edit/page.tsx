import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";
import { updatePatient } from "../../actions";
import { PatientForm } from "../../patient-form";

export const metadata: Metadata = { title: "Editar paciente · DentalFlow" };

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!canManagePatients(profile.role)) redirect("/patients");

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, birth_date, notes")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const updatePatientWithId = updatePatient.bind(null, patient.id);

  return (
    <div className="glass-card mx-auto w-full max-w-lg p-8">
      <h1 className="text-xl font-bold">Editar paciente</h1>
      <p className="mt-1 text-sm text-slate-500">
        Actualiza los datos de {patient.full_name}.
      </p>
      <div className="mt-6">
        <PatientForm
          action={updatePatientWithId}
          defaultValues={{
            full_name: patient.full_name,
            phone: patient.phone ?? "",
            email: patient.email ?? "",
            birth_date: patient.birth_date ?? "",
            notes: patient.notes ?? "",
          }}
          submitLabel="Guardar cambios"
          pendingLabel="Guardando…"
        />
      </div>
    </div>
  );
}
