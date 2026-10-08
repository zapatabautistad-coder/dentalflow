import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getMyClinic } from "@/lib/clinic";
import { updateClinic } from "./actions";
import { ClinicForm } from "./clinic-form";

export const metadata: Metadata = { title: "Clínica · DentalFlow" };

export default async function ClinicPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/panel");

  const clinic = await getMyClinic();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header>
        <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="clinic.title">Clínica</h1>
        <p className="mt-1 text-sm text-slate-600" data-i18n="clinic.subtitle">
          Estos datos aparecen en los recibos, las recetas y los recordatorios de cita.
        </p>
      </header>

      {clinic ? (
        <section className="crystal-card min-w-0 rounded-[22px] p-4">
          <ClinicForm action={updateClinic} clinic={clinic} />
        </section>
      ) : (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="clinic.loadError">
          No se pudieron cargar los datos de la clínica. Recarga la página.
        </p>
      )}
    </div>
  );
}
