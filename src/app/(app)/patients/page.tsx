import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canCreatePatients, requireProfile } from "@/lib/auth";
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

function insuranceText(patient: PatientRow): string {
  if (patient.insurance_type === "ars") return `ARS: ${patient.insurance_provider}`;
  if (patient.insurance_type === "privado") return "Privado";
  return "Sin aseguradora";
}

function contactLinks(patient: PatientRow) {
  const phoneDigits = patient.phone?.replace(/\D/g, "") ?? "";
  return {
    whatsapp: phoneDigits ? `https://wa.me/1${phoneDigits}` : "",
    email: patient.email ? `mailto:${patient.email}` : "",
    tel: patient.phone ? `tel:${patient.phone}` : "",
  };
}

function ContactButtons({
  patient,
  links,
  size,
}: {
  patient: PatientRow;
  links: ReturnType<typeof contactLinks>;
  size: "sm" | "lg";
}) {
  if (!links.whatsapp && !links.email && !links.tel) return null;
  const box = size === "lg" ? "h-11 w-11" : "h-8 w-8";

  return (
    <div className={`flex items-center gap-2 ${size === "lg" ? "mt-2" : ""}`}>
      {links.whatsapp && (
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp de ${patient.full_name}`}
          className={`flex ${box} items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100`}
        >
          <WhatsAppIcon />
        </a>
      )}
      {links.email && (
        <a
          href={links.email}
          aria-label={`Correo de ${patient.full_name}`}
          className={`flex ${box} items-center justify-center rounded-lg border border-slate-200 bg-white/70 text-[#0766B5] transition hover:bg-white`}
        >
          <EmailIcon />
        </a>
      )}
      {links.tel && (
        <a
          href={links.tel}
          aria-label={`Llamar a ${patient.full_name}`}
          className={`flex ${box} items-center justify-center rounded-lg border border-slate-200 bg-white/70 text-[#0766B5] transition hover:bg-white`}
        >
          <PhoneIcon />
        </a>
      )}
    </div>
  );
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const profile = await requireProfile();
  const canCreate = canCreatePatients(profile.role);

  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select(
      "id, full_name, document_id, phone, email, created_at, record_number, insurance_type, insurance_provider"
    )
    .is("archived_at", null)
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
          <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500" data-i18n="patients.subtitle">
            Clínicas / pacientes
          </p>
        </div>
        {canCreate && (
          <Link href="/patients/new" className="glass-button px-3 py-2 text-xs font-black uppercase tracking-[0.08em]" data-i18n="patients.new">
            + Nuevo paciente
          </Link>
        )}
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
          <>
            <ul className="flex flex-col divide-y divide-white/60 md:hidden">
              {patients.map((patient) => {
                const contact = contactLinks(patient);
                return (
                  <li key={patient.id} className="p-3">
                    <Link href={`/patients/${patient.id}`} className="block rounded-xl active:bg-white/40">
                      <p className="text-base font-semibold text-[#0F172A]">{patient.full_name}</p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        N.° {String(patient.record_number).padStart(4, "0")}
                        {patient.document_id ? ` · ${formatDominicanDocumentId(patient.document_id)}` : ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        {insuranceText(patient)}
                        {patient.phone ? ` · ${formatDominicanPhone(patient.phone)}` : ""}
                      </p>
                    </Link>
                    <ContactButtons patient={patient} links={contact} size="lg" />
                  </li>
                );
              })}
            </ul>

            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-white/60 text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.record">Expediente</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.name">Nombre</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.document">Cédula</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.phone">Teléfono</th>
                  <th className="px-4 py-2.5 font-medium" data-i18n="patients.table.insurance">Aseguradora</th>
                  <th className="px-4 py-2.5 font-medium">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <PatientRow key={patient.id} href={`/patients/${patient.id}`} clickable>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">
                      {String(patient.record_number).padStart(4, "0")}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium">{patient.full_name}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">
                      {patient.document_id ? formatDominicanDocumentId(patient.document_id) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">
                      {patient.phone ? formatDominicanPhone(patient.phone) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">{insuranceText(patient)}</td>
                    <td className="px-4 py-2.5">
                      <ContactButtons patient={patient} links={contactLinks(patient)} size="sm" />
                    </td>
                  </PatientRow>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
