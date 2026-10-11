import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, canManagePatients, canRecordMedication, canViewBilling, canWriteClinicalEntries, requireProfile } from "@/lib/auth";
import { formatDominicanDocumentId, formatDominicanPhone } from "@/lib/phone";
import {
  TIME_ZONE,
  formatHour,
  formatShortDate,
  splitLocalDateTime,
  subtractMonthsLocal,
  todayDateKey,
} from "@/lib/timezone";
import { StatusChip } from "../../appointments/status-chip";
import { addAiConsent, addClinicalEntry, addVitalSigns, archivePatient, restorePatient, saveMedicalHistory } from "../actions";
import { ArchiveForm } from "./archive-form";
import { ChangeLog, type AuditRow } from "./change-log";
import { ClinicalRecord, type ClinicalEntry } from "./clinical-record";
import { MedicalHistoryForm, type MedicalHistoryValues } from "./medical-history-form";
import { VitalSignsRecord, type PatientVitalSignsEntry } from "./vital-signs-record";
import { AiConsentRecord, type PatientAiConsentEntry } from "./ai-consent-record";
import { arsName } from "@/lib/insurance";
import { vitalSignsReasons } from "@/lib/vital-signs";

export const metadata: Metadata = { title: "Ficha del paciente · DentalFlow" };

type Patient = {
  id: string;
  full_name: string;
  document_id: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  record_number: number;
  insurance_type: "ars" | "privado" | null;
  insurance_provider: string | null;
  affiliate_number: string | null;
  archived_at: string | null;
  archived_reason: string | null;
  archiver: { full_name: string } | null;
};

type MedicalHistory = MedicalHistoryValues & {
  updated_at: string;
  profiles: { full_name: string } | null;
};

type PatientAppointment = {
  id: string;
  starts_at: string;
  reason: string | null;
  status: string;
  profiles: { full_name: string } | null;
};

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = todayDateKey().split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 ? age : null;
}

// key: texto fijo traducible; sin key: dato escrito por el usuario (no se traduce).
type Alert = { key?: string; text: string };

function activeAlerts(history: MedicalHistoryValues): Alert[] {
  const alerts: Alert[] = [];
  if (history.allergy_penicillin) alerts.push({ key: "alert.penicillin", text: "Alergia a penicilina / amoxicilina" });
  if (history.allergy_local_anesthetic) alerts.push({ key: "alert.anesthetic", text: "Alergia a anestésicos locales" });
  if (history.allergy_nsaids) alerts.push({ key: "alert.nsaids", text: "Alergia a AINEs" });
  if (history.allergy_latex) alerts.push({ key: "alert.latex", text: "Alergia al látex" });
  if (history.allergies_other) alerts.push({ text: `Alergia: ${history.allergies_other}` });
  if (history.takes_anticoagulants) alerts.push({ key: "alert.anticoagulants", text: "Toma anticoagulantes / antiagregantes" });
  if (history.takes_bisphosphonates) alerts.push({ key: "alert.bisphosphonates", text: "Toma bifosfonatos" });
  if (history.has_diabetes) alerts.push({ key: "alert.diabetes", text: "Diabetes" });
  if (history.has_hypertension) alerts.push({ key: "alert.hypertension", text: "Hipertensión" });
  if (history.has_heart_disease) alerts.push({ key: "alert.heart", text: "Cardiopatía" });
  if (history.is_pregnant) alerts.push({ key: "alert.pregnant", text: "Embarazo" });
  if (history.conditions_other) alerts.push({ text: history.conditions_other });
  return alerts;
}

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function isHistoryMoreThan12MonthsOld(updatedAt: string): boolean {
  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) return false;
  return updatedDate.getTime() < subtractMonthsLocal(new Date(), 12).getTime();
}

function formatHistoryDate(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

async function loadVitalSigns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string
): Promise<{ data: PatientVitalSignsEntry[]; error: string | null }> {
  const pageSize = 1000;
  const entries: PatientVitalSignsEntry[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("vital_signs")
      .select("id, systolic, diastolic, heart_rate, glucose_mg_dl, oxygen_saturation, note, corrects_entry_id, correction_reason, created_at, author_role, profiles(full_name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1)
      .returns<PatientVitalSignsEntry[]>();

    if (error) return { data: [], error: error.message };

    const page = data ?? [];
    entries.push(...page);
    if (page.length < pageSize) return { data: entries, error: null };
    offset += pageSize;
  }
}

function AppointmentList({ items, empty }: { items: PatientAppointment[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/50 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[#0F172A]">
              {formatShortDate(splitLocalDateTime(item.starts_at).dateKey)} · {formatHour(item.starts_at)}
            </p>
            <p className="truncate text-sm text-slate-600">
              {item.profiles?.full_name ?? "Sin doctor"}
              {item.reason ? ` · ${item.reason}` : ""}
            </p>
          </div>
          <StatusChip status={item.status} />
        </li>
      ))}
    </ul>
  );
}

export default async function PatientChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, full_name, document_id, birth_date, phone, email, notes, record_number, insurance_type, insurance_provider, affiliate_number, archived_at, archived_reason, archiver:profiles!patients_archived_by_fkey(full_name)"
    )
    .eq("id", id)
    .maybeSingle<Patient>();

  if (!patient) notFound();

  const nowIso = new Date().toISOString();
  const [historyResult, upcomingResult, pastResult, auditResult, entriesResult, vitalSignsResult, aiConsentResult] = await Promise.all([
    supabase
      .from("patient_medical_history")
      .select(
        "allergy_penicillin, allergy_local_anesthetic, allergy_latex, allergy_nsaids, allergies_other, takes_anticoagulants, takes_bisphosphonates, current_medications, has_diabetes, has_hypertension, has_heart_disease, is_pregnant, conditions_other, updated_at, profiles(full_name)"
      )
      .eq("patient_id", id)
      .maybeSingle<MedicalHistory>(),
    supabase
      .from("appointments")
      .select("id, starts_at, reason, status, profiles(full_name)")
      .eq("patient_id", id)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(5)
      .returns<PatientAppointment[]>(),
    supabase
      .from("appointments")
      .select("id, starts_at, reason, status, profiles(full_name)")
      .eq("patient_id", id)
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(5)
      .returns<PatientAppointment[]>(),
    supabase
      .from("audit_log")
      .select("id, table_name, action, changed_at, old_data, new_data, profiles(full_name)")
      .eq("patient_id", id)
      .order("changed_at", { ascending: false })
      .limit(30)
      .returns<AuditRow[]>(),
    supabase
      .from("clinical_entries")
      .select(
        "id, kind, body, medication_name, dose, route, administered_at, corrects_entry_id, correction_reason, created_at, author_role, profiles(full_name)"
      )
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ClinicalEntry[]>(),
    loadVitalSigns(supabase, id),
    supabase
      .from("ai_consents")
      .select("id, scope, granted, note, consent_version, created_at, recorded_role, profiles(full_name)")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PatientAiConsentEntry[]>(),
  ]);

  const history = historyResult.data;
  const historyFailed = Boolean(historyResult.error);
  const alerts = history ? activeAlerts(history) : [];
  const age = ageFrom(patient.birth_date);
  const saveHistory = saveMedicalHistory.bind(null, patient.id);
  const archiveThisPatient = archivePatient.bind(null, patient.id);
  const restoreThisPatient = restorePatient.bind(null, patient.id);
  const auditRows = auditResult.data ?? [];
  const addEntry = addClinicalEntry.bind(null, patient.id);
  const addVital = addVitalSigns.bind(null, patient.id);
  const addConsent = addAiConsent.bind(null, patient.id);
  const vitalReasons = history && !historyFailed ? vitalSignsReasons(history) : [];


  return (
    <div className="flex flex-col gap-4">
      <Link href="/patients" className="self-start text-sm font-semibold text-[#0766B5] hover:underline" data-i18n="chart.back">
        ← Pacientes
      </Link>

      {patient.archived_at && (
        <section role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-slate-400 bg-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-bold text-slate-800">Paciente archivado</p>
            <p className="mt-1 text-[15px] text-slate-700">
              {formatStamp(patient.archived_at)}
              {patient.archiver?.full_name ? ` por ${patient.archiver.full_name}` : ""} · Motivo: {patient.archived_reason}
            </p>
          </div>
          {profile.role === "admin" && (
            <form action={restoreThisPatient}>
              <button type="submit" className="glass-button min-h-11 text-[15px]">Restaurar paciente</button>
            </form>
          )}
        </section>
      )}

      <header className="glass-card flex flex-col gap-5 p-5 sm:p-6">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">{patient.full_name}</h1>
            {canManagePatients(profile.role) && (
              <Link
                href={`/patients/${patient.id}/edit`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[#0766B5] transition hover:bg-white/70"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" strokeLinejoin="round" />
                </svg>
                <span data-i18n="chart.editData">Editar datos</span>
              </Link>
            )}
          </div>
          <p className="mt-1.5 text-[15px] text-slate-600">
            <span data-i18n="chart.recordNo">Expediente N.°</span> {String(patient.record_number).padStart(4, "0")}
            {patient.document_id && (
              <>
                {" · "}
                <span data-i18n="chart.documentId">Cédula</span> {formatDominicanDocumentId(patient.document_id)}
              </>
            )}
            {age !== null && (
              <>
                {" · "}
                {age} <span data-i18n="chart.years">años</span>
              </>
            )}
          </p>
          <p className="mt-1 text-[15px] text-slate-600">
            {patient.insurance_type === "ars" ? (
              <>
                {arsName(patient.insurance_provider)} · <span data-i18n="chart.affiliate">Afiliado</span> {patient.affiliate_number}
              </>
            ) : patient.insurance_type === "privado" ? (
              <span data-i18n="insurance.private">Privado</span>
            ) : (
              <span data-i18n="chart.noInsurance">Sin aseguradora registrada</span>
            )}
          </p>
          {(patient.phone || patient.email) && (
            <p className="mt-1 text-[15px] text-slate-600">
              {[patient.phone ? formatDominicanPhone(patient.phone) : null, patient.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <nav aria-label="Secciones del paciente" className="flex flex-wrap items-center gap-2">
          <Link href={`/patients/${patient.id}/odontograma`} className="glass-button-light min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[15px]" data-i18n="odontogram.title">
            Odontograma
          </Link>
          <Link href={`/patients/${patient.id}/plan-tratamiento`} className="glass-button-light min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[15px]" data-i18n="plan.title">
            Plan de tratamiento
          </Link>
          <Link href={`/patients/${patient.id}/recetas`} className="glass-button-light min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[15px]" data-i18n="rx.title">
            Recetas
          </Link>
          {canViewBilling(profile.role) && (
            <Link href={`/patients/${patient.id}/facturacion`} className="glass-button-light min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[15px]" data-i18n="billing.title">
              Facturación
            </Link>
          )}
          {canManageAppointments(profile.role) && (
            <Link
              href={`/appointments/new?patient=${patient.id}`}
              className="glass-button ml-auto min-h-10 shrink-0 whitespace-nowrap rounded-full px-5 text-[15px]"
              data-i18n="chart.newAppointment"
            >
              Nueva cita
            </Link>
          )}
        </nav>
      </header>

      {history && isHistoryMoreThan12MonthsOld(history.updated_at) && (
        <section role="alert" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-900">
          Historial médico sin actualizar desde {formatHistoryDate(history.updated_at)}. Revíselo con el paciente antes de atender.
        </section>
      )}

      {historyFailed ? (
        <section role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-[15px] text-rose-800">
          No se pudo cargar el historial médico. Recarga la página antes de atender al paciente.
        </section>
      ) : !history ? (
        <section role="alert" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-base font-bold text-amber-900" data-i18n="chart.noHistory">Historial médico no registrado</p>
          <p className="mt-1 text-[15px] text-amber-900" data-i18n="chart.noHistory.hint">
            Pregunte por alergias, medicamentos y enfermedades antes de cualquier procedimiento, y regístrelo abajo.
          </p>
        </section>
      ) : alerts.length > 0 ? (
        <section role="alert" className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-4">
          <p className="text-base font-bold text-rose-800" data-i18n="chart.alerts">Alertas médicas</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <li
                key={alert.key ?? alert.text}
                className="rounded-full border border-rose-300 bg-white px-3 py-1 text-[15px] font-semibold text-rose-800"
                data-i18n={alert.key}
              >
                {alert.text}
              </li>
            ))}
          </ul>
          {history.current_medications && (
            <p className="mt-3 text-[15px] text-rose-900">
              <span className="font-semibold" data-i18n="chart.medications">Medicamentos:</span> {history.current_medications}
            </p>
          )}
          <p className="mt-2 text-sm text-rose-700">
            <span data-i18n="chart.updated">Actualizado</span> {formatStamp(history.updated_at)}
            {history.profiles?.full_name && (
              <>
                {" "}
                <span data-i18n="chart.by">por</span> {history.profiles.full_name}
              </>
            )}
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#95D3FA] bg-white/60 p-4">
          <p className="text-base font-bold text-[#0766B5]" data-i18n="chart.noAlerts">Sin alertas médicas registradas</p>
          {history.current_medications && (
            <p className="mt-1 text-[15px] text-slate-700">
              <span className="font-semibold" data-i18n="chart.medications">Medicamentos:</span> {history.current_medications}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">
            <span data-i18n="chart.updated">Actualizado</span> {formatStamp(history.updated_at)}
            {history.profiles?.full_name && (
              <>
                {" "}
                <span data-i18n="chart.by">por</span> {history.profiles.full_name}
              </>
            )}
          </p>
        </section>
      )}

      <section className="glass-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="chart.clinical">Registro clínico</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600" data-i18n="chart.clinical.hint">
          Notas de evolución, medicamentos administrados y procedimientos. Lo registrado no se edita ni se borra: se corrige con motivo.
        </p>
        {entriesResult.error ? (
          <p role="alert" className="text-[15px] text-rose-700">No se pudo cargar el registro clínico. Recarga la página.</p>
        ) : (
          <ClinicalRecord
            entries={entriesResult.data ?? []}
            canWrite={canWriteClinicalEntries(profile.role) && !patient.archived_at}
            action={addEntry}
            nowIso={nowIso}
            medicalHistoryStatus={historyFailed ? "unavailable" : history ? "recorded" : "missing"}
            canRecordMedication={canRecordMedication(profile.role)}
          />
        )}
      </section>

      <section className="glass-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="vitalSigns.title">Signos vitales</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600" data-i18n="vitalSigns.hint">
          Las tomas se conservan; un error se corrige con una nueva entrada y su motivo.
        </p>
        {vitalReasons.length > 0 && (
          <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <span data-i18n="vitalSigns.recommended">Se recomienda tomar signos vitales:</span>{" "}
            {vitalReasons.map((reason, index) => (
              <span key={reason}>
                {index > 0 ? ", " : ""}
                <span data-i18n={`vitalSigns.reason.${reason === "hipertensión" ? "hypertension" : reason === "diabetes" ? "diabetes" : "heartDisease"}`}>
                  {reason}
                </span>
              </span>
            ))}
          </p>
        )}
        {vitalSignsResult.error ? (
          <p role="alert" className="text-[15px] text-rose-700" data-i18n="vitalSigns.loadError">
            No se pudieron cargar los signos vitales. Recarga la página.
          </p>
        ) : (
          <VitalSignsRecord
            entries={vitalSignsResult.data}
            canWrite={canWriteClinicalEntries(profile.role) && !patient.archived_at}
            action={addVital}
          />
        )}
      </section>

      <section className="glass-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="aiConsent.title">Consentimiento para IA</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600" data-i18n="aiConsent.hint">
          Léale el texto al paciente y registre su decisión. No se edita: si cambia de opinión, se registra una nueva decisión.
        </p>
        {aiConsentResult.error ? (
          <p role="alert" className="text-[15px] text-rose-700" data-i18n="aiConsent.loadError">
            No se pudo cargar el consentimiento. Recarga la página.
          </p>
        ) : (
          <AiConsentRecord entries={aiConsentResult.data ?? []} canWrite={!patient.archived_at} action={addConsent} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="glass-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="chart.history">Historial médico</h2>
          <p className="mb-4 mt-1 text-sm text-slate-600" data-i18n="chart.history.hint">
            Marque lo que aplique. Quien guarde queda registrado con fecha y hora.
          </p>
          {historyFailed ? (
            <p className="text-sm text-slate-600">Disponible cuando el historial cargue correctamente.</p>
          ) : (
            <MedicalHistoryForm action={saveHistory} defaultValues={history} />
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="glass-card p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-[#0F172A]" data-i18n="chart.upcoming">Próximas citas</h2>
            <AppointmentList items={upcomingResult.data ?? []} empty="No tiene citas programadas." />
          </section>

          <section className="glass-card p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-[#0F172A]" data-i18n="chart.past">Citas anteriores</h2>
            <AppointmentList items={pastResult.data ?? []} empty="Sin citas anteriores." />
          </section>

          <section className="glass-card p-5 sm:p-6">
            <details>
              <summary className="cursor-pointer text-lg font-bold text-[#0F172A]">
                Ver cambios{auditRows.length > 0 ? ` (${auditRows.length}${auditRows.length === 30 ? "+" : ""})` : ""}
              </summary>
              <p className="mb-3 mt-1 text-sm text-slate-600">
                Registro automático de quién creó o cambió cada dato y cuándo. No se puede editar ni borrar.
              </p>
              {auditResult.error ? (
                <p className="text-sm text-rose-700">No se pudo cargar el registro de cambios.</p>
              ) : (
                <ChangeLog rows={auditRows} />
              )}
            </details>
          </section>

          {canManagePatients(profile.role) && !patient.archived_at && <ArchiveForm action={archiveThisPatient} />}

          {patient.notes && (
            <section className="glass-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-bold text-[#0F172A]" data-i18n="chart.notes">Notas</h2>
              <p className="whitespace-pre-line text-[15px] text-slate-700">{patient.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
