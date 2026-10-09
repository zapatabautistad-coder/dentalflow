import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createClinic, setClinicActive } from "./actions";
import { NewClinicForm, ToggleClinicForm } from "./platform-forms";

export const metadata: Metadata = { title: "Plataforma · DentalFlow" };

type ClinicRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  admins: number;
  patients: number;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PlatformPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (isPlatform !== true) redirect("/panel");

  const { data, error } = await supabase.rpc("platform_list_clinics");
  const clinics = (data ?? []) as ClinicRow[];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header>
        <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="platform.title">Plataforma</h1>
        <p className="mt-1 text-sm text-slate-600" data-i18n="platform.subtitle">
          Crea clínicas nuevas con su primer administrador y actívalas o desactívalas. Las clínicas no se borran.
        </p>
      </header>

      <section className="crystal-card min-w-0 rounded-[22px] p-4">
        <h2 className="mb-3 text-base font-black text-[#0F172A]" data-i18n="platform.new">Nueva clínica</h2>
        <NewClinicForm action={createClinic} />
      </section>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="platform.loadError">
          No se pudieron cargar las clínicas. Recarga la página.
        </p>
      ) : clinics.length === 0 ? (
        <p className="crystal-card rounded-[20px] p-6 text-center text-sm text-slate-500" data-i18n="platform.empty">
          Todavía no hay clínicas.
        </p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {clinics.map((clinic) => (
            <li key={clinic.id} className={`crystal-card min-w-0 rounded-[20px] p-4 ${clinic.active ? "" : "opacity-80"}`}>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-[15px] font-bold text-[#0F172A]">{clinic.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {Number(clinic.admins)} <span data-i18n="platform.admins">admins</span> · {Number(clinic.patients)}{" "}
                    <span data-i18n="platform.patients">pacientes</span> ·{" "}
                    <span data-i18n="accounts.createdOn">Creada el</span> {formatDate(clinic.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    clinic.active
                      ? "border-[#95D3FA] bg-[#95D3FA]/20 text-[#0766B5]"
                      : "border-slate-300 bg-slate-100 text-slate-600"
                  }`}
                >
                  {clinic.active ? <span data-i18n="accounts.active">Activa</span> : <span data-i18n="platform.inactive">Inactiva</span>}
                </span>
              </div>
              <div className="mt-3">
                <ToggleClinicForm action={setClinicActive.bind(null, clinic.id, !clinic.active)} active={clinic.active} name={clinic.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
