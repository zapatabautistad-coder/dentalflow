import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";
import { PatientRow } from "./patient-row";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "Pacientes · DentalFlow" };

type PatientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
};

// El texto de búsqueda entra en un filtro or() de PostgREST, donde
// `%`, `,`, `(` y `)` tienen significado especial: se descartan.
function sanitizeSearch(value: string) {
  return value.replace(/[%,()]/g, "").trim();
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const profile = await requireProfile();
  const canManage = canManagePatients(profile.role);

  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("id, full_name, phone, created_at")
    .order("created_at", { ascending: false });

  const search = sanitizeSearch(q ?? "");
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: patients } = await query.returns<PatientRow[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona la lista de pacientes de la clínica.
          </p>
        </div>
        {canManage && (
          <Link href="/patients/new" className="glass-button">
            + Nuevo paciente
          </Link>
        )}
      </div>

      <div className="glass-card p-4">
        <SearchBox defaultValue={q ?? ""} />
      </div>

      <div className="glass-card overflow-hidden">
        {!patients || patients.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {search
              ? "No se encontraron pacientes con ese criterio de búsqueda."
              : "Todavía no hay pacientes registrados."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/60 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    href={`/patients/${patient.id}/edit`}
                    clickable={canManage}
                  >
                    <td className="px-6 py-3.5 font-medium">{patient.full_name}</td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {patient.phone || "—"}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {new Date(patient.created_at).toLocaleDateString("es", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </PatientRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
