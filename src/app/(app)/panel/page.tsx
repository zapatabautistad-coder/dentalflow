import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import {
  dayBoundsUtc,
  formatDateLong,
  formatHour,
  subtractMonthsLocal,
  TIME_ZONE,
  todayDateKey,
} from "@/lib/timezone";
import { StatusChip } from "../appointments/status-chip";
import { checkInAppointment } from "../waiting-room/actions";
import { arsName } from "@/lib/insurance";

export const metadata: Metadata = { title: "Panel · DentalFlow" };

type AgendaRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

type RecentPatient = {
  id: string;
  full_name: string;
  record_number: number;
  insurance_type: "ars" | "privado" | null;
  insurance_provider: string | null;
};

type ReviewAppointmentRow = {
  patient_id: string;
  starts_at: string;
  patients: { full_name: string; phone: string | null; archived_at: string | null } | null;
};

type ReviewPatient = {
  id: string;
  full_name: string;
  phone: string | null;
  lastVisit: string;
};

type ReviewPatientsResult = { patients: ReviewPatient[]; error: boolean };

function insuranceLabel(patient: RecentPatient) {
  if (patient.insurance_type === "ars") return arsName(patient.insurance_provider);
  if (patient.insurance_type === "privado") return "Privado";
  return "Sin aseguradora";
}

type ReviewRpcRow = {
  patient_id: string;
  full_name: string;
  phone: string | null;
  last_visit: string;
};

const REVIEW_LIMIT = 8;
// Tope del respaldo en JS (solo si la migración 017 aún no está aplicada).
const FALLBACK_PAGE_SIZE = 250;
const FALLBACK_MAX_PAGES = 4;

// "Pendiente de revisión": última cita completada hace más de 6 meses,
// sin citas completadas desde entonces, sin citas próximas (programada o
// confirmada) y no archivado. La regla vive en la función SQL
// `patients_for_review` (migración 017); el respaldo en JS la replica.
async function findPatientsForReview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cutoffIso: string,
  nowIso: string
): Promise<ReviewPatientsResult> {
  const { data, error } = await supabase.rpc("patients_for_review", {
    p_cutoff: cutoffIso,
    p_now: nowIso,
    p_limit: REVIEW_LIMIT,
  });

  if (!error) {
    const rows = (data ?? []) as ReviewRpcRow[];
    return {
      patients: rows.map((row) => ({
        id: row.patient_id,
        full_name: row.full_name,
        phone: row.phone,
        lastVisit: row.last_visit,
      })),
      error: false,
    };
  }

  // PGRST202 / 42883: la función aún no existe en la base.
  if (error.code === "PGRST202" || error.code === "42883") {
    return findPatientsForReviewFallback(supabase, cutoffIso, nowIso);
  }

  return { patients: [], error: true };
}

async function findPatientsForReviewFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cutoffIso: string,
  nowIso: string
): Promise<ReviewPatientsResult> {
  const seenPatientIds = new Set<string>();
  const patients: ReviewPatient[] = [];

  for (let page = 0; page < FALLBACK_MAX_PAGES; page += 1) {
    const offset = page * FALLBACK_PAGE_SIZE;
    const { data: visits, error } = await supabase
      .from("appointments")
      .select("patient_id, starts_at, patients!inner(full_name, phone, archived_at)")
      .eq("status", "completada")
      .lt("starts_at", cutoffIso)
      .is("patients.archived_at", null)
      .order("starts_at", { ascending: false })
      .range(offset, offset + FALLBACK_PAGE_SIZE - 1)
      .returns<ReviewAppointmentRow[]>();

    if (error) return { patients: [], error: true };

    const candidates: ReviewPatient[] = [];
    for (const visit of visits ?? []) {
      if (!visit.patients || seenPatientIds.has(visit.patient_id)) continue;
      seenPatientIds.add(visit.patient_id);
      candidates.push({
        id: visit.patient_id,
        full_name: visit.patients.full_name,
        phone: visit.patients.phone,
        lastVisit: visit.starts_at,
      });
    }

    if (candidates.length > 0) {
      const candidateIds = candidates.map((patient) => patient.id);
      const [recentCompleted, upcoming] = await Promise.all([
        supabase
          .from("appointments")
          .select("patient_id")
          .in("patient_id", candidateIds)
          .eq("status", "completada")
          .gte("starts_at", cutoffIso),
        supabase
          .from("appointments")
          .select("patient_id")
          .in("patient_id", candidateIds)
          .in("status", ["programada", "confirmada"])
          .gt("starts_at", nowIso),
      ]);

      if (recentCompleted.error || upcoming.error) return { patients: [], error: true };

      const hasRecentCompleted = new Set((recentCompleted.data ?? []).map((visit) => visit.patient_id));
      const hasUpcoming = new Set((upcoming.data ?? []).map((appointment) => appointment.patient_id));
      for (const patient of candidates) {
        if (hasRecentCompleted.has(patient.id) || hasUpcoming.has(patient.id)) continue;
        patients.push(patient);
        if (patients.length === REVIEW_LIMIT) return { patients, error: false };
      }
    }

    if (!visits || visits.length < FALLBACK_PAGE_SIZE) break;
  }

  return { patients, error: false };
}

function formatReviewDate(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function whatsappUrl(phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits ? `https://wa.me/1${digits}` : null;
}

export default async function PanelPage() {
  const profile = await requireProfile();
  const canManageAgenda = canManageAppointments(profile.role);

  const dateKey = todayDateKey();
  const { start, end } = dayBoundsUtc(dateKey);
  const nowIso = new Date().toISOString();
  // Corte de revisión: hace 6 meses, a la misma hora local (al minuto).
  const reviewCutoffDate = subtractMonthsLocal(new Date(nowIso), 6);
  reviewCutoffDate.setUTCSeconds(0, 0);
  const reviewCutoff = reviewCutoffDate.toISOString();
  const supabase = await createClient();

  const [patientsCount, agendaResult, waitingCount, queueAppointmentsResult, recentResult, reviewPatientsResult] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, starts_at, duration_minutes, reason, status, patients(full_name), profiles(full_name)")
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true })
      .returns<AgendaRow[]>(),
    supabase
      .from("queue")
      .select("id", { count: "exact", head: true })
      .eq("queue_date", dateKey)
      .eq("status", "en_espera"),
    canManageAgenda
      ? supabase.from("queue").select("appointment_id").eq("queue_date", dateKey).neq("status", "cancelado")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("patients")
      .select("id, full_name, record_number, insurance_type, insurance_provider")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentPatient[]>(),
    canManageAgenda
      ? findPatientsForReview(supabase, reviewCutoff, nowIso)
      : Promise.resolve<ReviewPatientsResult>({ patients: [], error: false }),
  ]);

  const agenda = agendaResult.data ?? [];
  const queueAppointmentIds = new Set((queueAppointmentsResult.data ?? []).map((entry) => entry.appointment_id).filter(Boolean));
  const recentPatients = recentResult.data ?? [];
  const activeAgenda = agenda.filter((item) => item.status !== "cancelada");
  const completedToday = agenda.filter((item) => item.status === "completada").length;
  const loadFailed = Boolean(patientsCount.error || agendaResult.error || waitingCount.error || queueAppointmentsResult.error || recentResult.error);

  const metrics = [
    { key: "panel.kpi.patients", label: "Pacientes registrados", value: patientsCount.count ?? 0 },
    { key: "panel.kpi.appointments", label: "Citas de hoy", value: activeAgenda.length },
    { key: "panel.kpi.waiting", label: "En sala de espera", value: waitingCount.count ?? 0 },
    { key: "panel.kpi.completed", label: "Completadas hoy", value: completedToday },
  ];

  return (
    <div className="w-full">
      <header className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="panel.title">Panel general</p>
          <h1
            className="mt-1 text-[1.7rem] font-black tracking-[-0.05em] text-[#0F172A]"
            data-i18n-name="panel.welcome"
            data-user-name={profile.fullName}
            suppressHydrationWarning
          >
            Hola, {profile.fullName}
          </h1>
          <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">{formatDateLong(dateKey)}</p>
        </div>

        {canManageAgenda && (
          <Link href="/appointments/new" className="glass-button self-start px-3 py-1.75 text-xs font-bold uppercase tracking-[0.08em] xl:self-auto" data-i18n="panel.newAppointment">
            + nueva cita
          </Link>
        )}
      </header>

      {loadFailed && (
        <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-i18n="panel.loadError">
          No se pudieron cargar algunos datos. Recarga la página.
        </p>
      )}

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="crystal-card rounded-[22px] p-3.5 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.6)]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n={metric.key}>{metric.label}</p>
            <p className="mt-2.5 text-[1.6rem] font-black tracking-[-0.06em] text-[#0766B5]">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.48fr)_minmax(0,0.97fr)]">
        <div className="crystal-card rounded-[24px] p-3.5">
          <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-2.5">
            <div>
              <h2 className="text-base font-black tracking-[-0.03em] text-[#0F172A]" data-i18n="panel.agenda">Agenda de Hoy</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500" data-i18n="panel.agenda.subtitle">Citas programadas</p>
            </div>
            <Link href="/appointments" className="text-xs font-bold uppercase tracking-[0.08em] text-[#0766B5] hover:underline" data-i18n="panel.agenda.view">
              Ver todo
            </Link>
          </div>

          {agenda.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500" data-i18n="panel.agenda.empty">No hay citas para hoy.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {agenda.map((item) => {
                const content = (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 basis-[13rem] items-center gap-2.5">
                      <div className="min-w-[46px] shrink-0 whitespace-nowrap text-[13px] font-black tracking-[0.08em] text-[#0766B5]">
                        {formatHour(item.starts_at)}
                      </div>
                      <div className="h-8 w-px shrink-0 bg-slate-200" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-black text-[#0F172A]">{item.patients?.full_name ?? "Paciente"}</p>
                        <p className="mt-0.5 truncate text-[13px] text-slate-500">
                          {item.profiles?.full_name ?? "Sin doctor"}
                          {item.reason ? ` · ${item.reason}` : ""}
                        </p>
                      </div>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                );

                return (
                  <li key={item.id}>
                    <div className="flex min-w-0 flex-col gap-2 rounded-[16px] border border-white/80 bg-white/40 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-[#95D3FA] hover:bg-white/70 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        href={canManageAgenda ? `/appointments/${item.id}/edit` : `/patients/${item.patient_id}`}
                        className="block min-w-0 flex-1"
                      >
                        {content}
                      </Link>
                      {canManageAgenda && !queueAppointmentsResult.error && (item.status === "programada" || item.status === "confirmada") && !queueAppointmentIds.has(item.id) && (
                        <form action={checkInAppointment.bind(null, item.id)}>
                          <button type="submit" className="glass-button min-h-11 w-full px-4 text-sm font-semibold sm:w-auto" data-i18n="waitingRoom.action.arrived">
                            Llegó
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="crystal-card rounded-[22px] p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="panel.recent">Pacientes recientes</h3>
            <Link href="/patients" className="text-xs font-black uppercase tracking-[0.08em] text-[#0766B5] hover:underline" data-i18n="panel.recent.view">
              Ver todos
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500" data-i18n="panel.recent.empty">Aún no hay pacientes registrados.</p>
          ) : (
            <ul className="space-y-2">
              {recentPatients.map((patient) => {
                const content = (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-[#0F172A]">{patient.full_name}</p>
                      <p className="truncate text-xs text-slate-500">{insuranceLabel(patient)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-black tracking-[0.12em] text-[#0766B5]">
                      N.° {String(patient.record_number).padStart(4, "0")}
                    </span>
                  </>
                );

                return (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/50 px-2.5 py-2 transition hover:border-[#95D3FA] hover:bg-white/70"
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {canManageAgenda && (
        <section className="mt-4 crystal-card min-w-0 rounded-[22px] p-3.5">
          <h2 className="text-base font-black text-[#0F172A]" data-i18n="panel.review.title">Pacientes para revisión</h2>
          {reviewPatientsResult.error ? (
            <p role="alert" className="py-5 text-center text-sm text-rose-700" data-i18n="panel.review.loadError">
              No se pudieron cargar los pacientes para revisión.
            </p>
          ) : reviewPatientsResult.patients.length === 0 ? (
            <p className="py-5 text-center text-sm text-slate-500" data-i18n="panel.review.empty">
              No hay pacientes pendientes de revisión.
            </p>
          ) : (
            <ul className="mt-3 grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
              {reviewPatientsResult.patients.map((patient) => {
                const whatsapp = whatsappUrl(patient.phone);

                return (
                  <li key={patient.id} className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] border border-white/80 bg-white/40 p-3">
                    <Link href={`/patients/${patient.id}`} className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-[#0F172A]">{patient.full_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        <span data-i18n="panel.review.lastVisit">Última visita:</span> {formatReviewDate(patient.lastVisit)}
                      </p>
                    </Link>
                    {whatsapp && (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
