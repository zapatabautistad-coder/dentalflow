import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManagePatients, requireProfile } from "@/lib/auth";
import { formatDominicanDocumentId, formatDominicanPhone } from "@/lib/phone";
import { buildPatientSearchFilter } from "@/lib/patient-search";
import { PatientRow } from "./patient-row";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "Pacientes · DentalFlow" };

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M20.52 3.48A11.89 11.89 0 0 0 12.03 0C5.47 0 .12 5.35.12 11.91c0 2.1.55 4.14 1.59 5.95L0 24l6.35-1.66A11.9 11.9 0 0 0 12.03 24C18.59 24 24 18.65 24 12.09c0-3.18-1.24-6.18-3.48-8.61ZM12.03 21.82c-1.84 0-3.64-.5-5.21-1.44l-.37-.22-3.77 1 1-3.67-.24-.38A9.87 9.87 0 0 1 2.2 12.1c0-5.45 4.44-9.9 9.83-9.9 2.63 0 5.1 1.02 6.96 2.88A9.81 9.81 0 0 1 21.86 12.1c0 5.45-4.44 9.72-9.83 9.72Zm5.42-7.26c-.3-.15-1.75-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.76.96-.94 1.15-.17.2-.35.22-.65.08-.3-.15-1.26-.47-2.39-1.49-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.47.13-.62l.44-.54c.15-.15.2-.35.3-.58.1-.23.05-.43-.03-.58-.08-.15-.67-1.62-.92-2.23-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.35-.27.28-1.03 1-1.03 2.44 0 1.44 1.05 2.82 1.2 3.02.15.2 2.05 3.13 4.97 4.4.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.11.57-.09 1.75-.71 2-.4.26.3.26.58.17.9-.08.31-1.08 1.65-1.33 2.17-.24.52-.49.46-.84.28-.35-.17-1.3-.53-2.48-1.5-.87-.64-1.46-1.42-1.63-1.66-.17-.25-.14-.39.02-.58.08-.09.18-.25.28-.39.12-.14.15-.24.22-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.76Z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.97.36 1.91.68 2.82a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.26-1.34a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.82.68A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

type PatientRow = {
  id: string;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  record_number: number;
  insurance_type: "ars" | "privado" | null;
  insurance_provider: string | null;
};

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
    .select(
      "id, full_name, document_id, phone, email, created_at, record_number, insurance_type, insurance_provider"
    )
    .order("created_at", { ascending: false });

  const searchFilter = buildPatientSearchFilter(q ?? "");
  if (searchFilter) {
    query = query.or(searchFilter);
  }

  const { data: patients } = await query.returns<PatientRow[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem] font-black tracking-[-0.05em] text-[#0F172A]" data-i18n="patients.title">Pacientes</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500" data-i18n="patients.subtitle">
            Clínicas / pacientes
          </p>
        </div>
        {canManage && (
          <Link href="/patients/new" className="glass-button px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em]" data-i18n="patients.new">
            + Nuevo paciente
          </Link>
        )}
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        <div className="crystal-card rounded-[18px] p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Total</p>
          <p className="mt-2 text-xl font-black tracking-[-0.06em] text-[#0F172A]">{patients?.length ?? 0}</p>
        </div>
        <div className="crystal-card rounded-[18px] p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Atención</p>
          <p className="mt-2 text-xl font-black tracking-[-0.06em] text-[#0F172A]">0</p>
        </div>
        <div className="crystal-card rounded-[18px] p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Contacto</p>
          <p className="mt-2 text-xl font-black tracking-[-0.06em] text-[#0F172A]">0</p>
        </div>
      </div>

      <div className="glass-card p-3">
        <SearchBox defaultValue={q ?? ""} />
      </div>

      <div className="glass-card overflow-hidden">
        {!patients || patients.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500" data-i18n={searchFilter ? "patients.empty.search" : "patients.empty.none"}>
            {searchFilter
              ? "No se encontraron pacientes con ese criterio de búsqueda."
              : "Todavía no hay pacientes registrados."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/60 text-[9px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.record">Expediente</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.name">Nombre</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.document">Cédula</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.phone">Teléfono</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.insurance">Aseguradora</th>
                  <th className="px-4 py-2.5 font-medium">Contacto</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.registered">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  const phoneDigits = patient.phone?.replace(/\D/g, "") ?? "";
                  const whatsappHref = phoneDigits ? `https://wa.me/1${phoneDigits}` : "";
                  const emailHref = patient.email ? `mailto:${patient.email}` : "";
                  const telHref = patient.phone ? `tel:${patient.phone}` : "";

                  return (
                    <PatientRow
                      key={patient.id}
                      href={`/patients/${patient.id}/edit`}
                      clickable={canManage}
                    >
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {String(patient.record_number).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-medium">{patient.full_name}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {patient.document_id
                          ? formatDominicanDocumentId(patient.document_id)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {patient.phone ? formatDominicanPhone(patient.phone) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {patient.insurance_type === "ars"
                          ? `ARS: ${patient.insurance_provider}`
                          : patient.insurance_type === "privado"
                            ? "Privado"
                            : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {whatsappHref && (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`WhatsApp de ${patient.full_name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <WhatsAppIcon />
                            </a>
                          )}
                          {emailHref && (
                            <a
                              href={emailHref}
                              aria-label={`Correo de ${patient.full_name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                            >
                              <EmailIcon />
                            </a>
                          )}
                          {telHref && (
                            <a
                              href={telHref}
                              aria-label={`Llamar a ${patient.full_name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                            >
                              <PhoneIcon />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {new Date(patient.created_at).toLocaleDateString("es", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </PatientRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
