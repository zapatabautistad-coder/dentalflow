import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { dayBoundsUtc, TIME_ZONE, todayDateKey } from "@/lib/timezone";

export const metadata: Metadata = { title: "Análisis · DentalFlow" };

const APPOINTMENT_STATUSES = [
  "programada",
  "confirmada",
  "en_curso",
  "completada",
  "cancelada",
  "no_asistio",
] as const;
const APPOINTMENT_STATUS_LABELS: Record<(typeof APPOINTMENT_STATUSES)[number], string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  en_curso: "En curso",
  completada: "Completada",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

function isValidMonthKey(value: string): boolean {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return Boolean(match && Number(match[1]) >= 1000);
}

function monthBoundsUtc(monthKey: string): { start: string; end: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const nextMonthKey = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;

  return {
    start: dayBoundsUtc(`${monthKey}-01`).start,
    end: dayBoundsUtc(nextMonthKey).start,
  };
}

function formatMonthLabel(monthKey: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-15T12:00:00-04:00`));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("es-DO").format(value);
}

function formatMoney(value: number): string {
  return `RD$ ${new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

async function sumMonthlyPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  start: string,
  end: string
) {
  const pageSize = 1000;
  let offset = 0;
  let totalCents = 0;

  while (true) {
    const { data, error } = await supabase
      .from("billing_payments")
      .select("amount")
      .is("voided_at", null)
      .gte("received_at", start)
      .lt("received_at", end)
      .order("received_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) return { value: 0, error };

    const rows = data ?? [];
    totalCents += rows.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0);
    if (rows.length < pageSize) return { value: totalCents / 100, error: null };

    offset += pageSize;
  }
}

async function sumPendingArs(supabase: Awaited<ReturnType<typeof createClient>>) {
  const pageSize = 1000;
  let offset = 0;
  let totalCents = 0;

  while (true) {
    const { data, error } = await supabase
      .from("billing_charges")
      .select("ars_coverage")
      .is("voided_at", null)
      .in("ars_status", ["pendiente", "reclamado"])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) return { value: 0, error };

    const rows = data ?? [];
    totalCents += rows.reduce((sum, charge) => sum + Math.round(Number(charge.ars_coverage) * 100), 0);
    if (rows.length < pageSize) return { value: totalCents / 100, error: null };

    offset += pageSize;
  }
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const profile = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "doctor") redirect("/panel");

  const requestedMonth = (await searchParams).month;
  const monthParam = Array.isArray(requestedMonth) ? requestedMonth[0] : requestedMonth;
  const currentMonth = todayDateKey().slice(0, 7);
  const monthKey = monthParam && isValidMonthKey(monthParam) ? monthParam : currentMonth;
  const { start, end } = monthBoundsUtc(monthKey);

  const supabase = await createClient();
  const [appointmentResults, patientsResult, proceduresResult, paymentsResult, arsResult] = await Promise.all([
    Promise.all(
      APPOINTMENT_STATUSES.map((status) =>
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", status)
          .gte("starts_at", start)
          .lt("starts_at", end)
      )
    ),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("treatment_plan_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "completado")
      .gte("completed_at", start)
      .lt("completed_at", end),
    sumMonthlyPayments(supabase, start, end),
    sumPendingArs(supabase),
  ]);

  const hasError =
    appointmentResults.some((result) => result.error) ||
    Boolean(patientsResult.error) ||
    Boolean(proceduresResult.error) ||
    Boolean(paymentsResult.error) ||
    Boolean(arsResult.error);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="analytics.title">Análisis</h1>
          <p className="mt-1 text-sm capitalize text-slate-600">
            <span data-i18n="analytics.period">Período:</span> {formatMonthLabel(monthKey)}
          </p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label htmlFor="analysis-month" className="flex flex-col gap-1 text-xs font-bold text-slate-600">
            <span data-i18n="analytics.month">Mes</span>
            <input
              id="analysis-month"
              name="month"
              type="month"
              defaultValue={monthKey}
              className="glass-input min-h-11 px-3 text-sm"
            />
          </label>
          <button type="submit" className="glass-button min-h-11 px-4 text-sm font-semibold" data-i18n="analytics.viewMonth">
            Ver mes
          </button>
        </form>
      </header>

      {hasError ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="analytics.loadError">
          No se pudieron cargar los datos del análisis. Recarga la página.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="crystal-card rounded-[18px] p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="analytics.newPatients">
                Pacientes nuevos del mes
              </p>
              <p className="mt-2 text-2xl font-black text-[#0F172A]">{formatCount(patientsResult.count ?? 0)}</p>
            </div>
            <div className="crystal-card rounded-[18px] p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="analytics.completedProcedures">
                Procedimientos completados del mes
              </p>
              <p className="mt-2 text-2xl font-black text-[#0F172A]">{formatCount(proceduresResult.count ?? 0)}</p>
            </div>
            <div className="crystal-card rounded-[18px] p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="analytics.collected">
                Total cobrado en el mes
              </p>
              <p className="mt-2 text-2xl font-black text-[#0F172A]">{formatMoney(paymentsResult.value)}</p>
            </div>
            <div className="crystal-card rounded-[18px] p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500" data-i18n="analytics.pendingArs">
                Pendiente de ARS
              </p>
              <p className="mt-2 text-2xl font-black text-[#0F172A]">{formatMoney(arsResult.value)}</p>
            </div>
          </section>

          <section className="crystal-card overflow-hidden rounded-[20px]">
            <div className="border-b border-white/70 px-4 py-3">
              <h2 className="text-sm font-black text-slate-800" data-i18n="analytics.appointmentsByStatus">
                Citas del mes por estado
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[24rem] text-left text-sm">
                <thead className="bg-white/40 text-xs uppercase tracking-[0.06em] text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5" data-i18n="analytics.status">Estado</th>
                    <th scope="col" className="px-4 py-2.5 text-right" data-i18n="analytics.appointmentCount">Citas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70 text-slate-700">
                  {APPOINTMENT_STATUSES.map((status, index) => (
                    <tr key={status}>
                      <th scope="row" className="px-4 py-3 text-left font-semibold" data-i18n={`appointments.status.${status}`}>
                        {APPOINTMENT_STATUS_LABELS[status]}
                      </th>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCount(appointmentResults[index].count ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}