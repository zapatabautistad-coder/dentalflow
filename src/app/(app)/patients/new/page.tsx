import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManagePatients, requireProfile } from "@/lib/auth";
import { createPatient } from "../actions";
import { PatientForm } from "../patient-form";

export const metadata: Metadata = { title: "Nuevo paciente · DentalFlow" };

export default async function NewPatientPage() {
  const profile = await requireProfile();
  if (!canManagePatients(profile.role)) redirect("/patients");

  return (
    <div className="glass-card mx-auto w-full max-w-2xl p-3 sm:p-4">
      <div className="mb-2">
        <h1 className="text-lg font-bold">Nuevo paciente</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Completa los datos del paciente.
        </p>
      </div>
      <PatientForm
        action={createPatient}
        submitLabel="Guardar paciente"
        pendingLabel="Guardando…"
      />
    </div>
  );
}
