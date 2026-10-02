import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageBilling, canViewBilling, requireProfile } from "@/lib/auth";
import {
  ARS_NEXT,
  ARS_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  patientBalance,
  type ArsClaimStatus,
  type ChargeForBalance,
  type PaymentForBalance,
  type PaymentMethod,
} from "@/lib/billing";
import { formatPesos } from "@/lib/treatment-plan";
import { TIME_ZONE } from "@/lib/timezone";
import {
  addCharge,
  addPayment,
  advanceArsClaim,
  voidCharge,
  voidPayment,
} from "./actions";
import {
  ArsAdvanceForm,
  BillingLanguageBridge,
  BillingForms,
  type CompletedBillablePlanItem,
  VoidBillingForm,
} from "./billing-forms";

export const metadata: Metadata = { title: "Facturación · DentalFlow" };

type Patient = {
  id: string;
  full_name: string;
  record_number: number;
  insurance_type: "ars" | "privado" | null;
  insurance_provider: string | null;
  affiliate_number: string | null;
};

type BillingCharge = ChargeForBalance & {
  id: string;
  description: string;
  amount: number | string;
  ars_coverage: number | string;
  patient_amount: number | string;
  ars_name: string | null;
  ars_authorization: string | null;
  ars_status: ArsClaimStatus;
  treatment_plan_item_id: string | null;
  created_at: string;
  void_reason: string | null;
  creator: { full_name: string } | null;
};

type BillingPayment = PaymentForBalance & {
  id: string;
  receipt_number: number;
  amount: number | string;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  received_at: string;
  void_reason: string | null;
  receiver: { full_name: string } | null;
};

type CompletedPlanItem = CompletedBillablePlanItem;

function formatBillingDate(iso: string): string {
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

function SummaryCard({ labelKey, label, value, valueClass = "text-[#0766B5]" }: { labelKey: string; label: string; value: string; valueClass?: string }) {
  return (
    <div className="crystal-card min-w-0 rounded-2xl p-4">
      <p className="break-words text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n={labelKey}>{label}</p>
      <p className={`mt-2 break-words text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

export default async function PatientBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!canViewBilling(profile.role)) redirect(`/patients/${id}`);

  const supabase = await createClient();
  const [patientResult, chargesResult, paymentsResult, planResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, record_number, insurance_type, insurance_provider, affiliate_number")
      .eq("id", id)
      .maybeSingle<Patient>(),
    supabase
      .from("billing_charges")
      .select(
        "id, description, amount, ars_coverage, patient_amount, ars_name, ars_authorization, ars_status, treatment_plan_item_id, created_at, voided_at, void_reason, creator:profiles!billing_charges_created_by_fkey(full_name)"
      )
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .returns<BillingCharge[]>(),
    supabase
      .from("billing_payments")
      .select(
        "id, receipt_number, amount, method, reference, note, received_at, voided_at, void_reason, receiver:profiles!billing_payments_received_by_fkey(full_name)"
      )
      .eq("patient_id", id)
      .order("received_at", { ascending: false })
      .returns<BillingPayment[]>(),
    supabase
      .from("treatment_plan_items")
      .select("id, tooth, procedure, estimated_cost")
      .eq("patient_id", id)
      .eq("status", "completado")
      .order("completed_at", { ascending: false })
      .returns<CompletedPlanItem[]>(),
  ]);

  if (patientResult.error) {
    return (
      <>
        <BillingLanguageBridge />
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="billing.patientLoadError">
          No se pudo cargar la información del paciente.
        </p>
      </>
    );
  }

  const patient = patientResult.data;
  if (!patient) notFound();

  const charges = chargesResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const canManage = canManageBilling(profile.role);
  const chargeIds = new Set(charges.map((charge) => charge.treatment_plan_item_id).filter((value): value is string => Boolean(value)));
  const unbilledProcedures = (planResult.data ?? []).filter((item) => !chargeIds.has(item.id));
  const balance = patientBalance(charges, payments);
  const balanceHasError = chargesResult.error || paymentsResult.error;
  const arsName = patient.insurance_type === "ars" ? patient.insurance_provider ?? "" : "";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <BillingLanguageBridge />
      <Link href={`/patients/${patient.id}`} className="self-start text-sm font-semibold text-[#0766B5] hover:underline">
        ← {patient.full_name}
      </Link>

      <header className="flex min-w-0 flex-col gap-1">
        <h1 className="break-words text-[1.6rem] font-black text-[#0F172A]" data-i18n="billing.title">Facturación</h1>
        <p className="break-words text-sm text-slate-600">
          {patient.full_name} · <span data-i18n="chart.recordNo">Expediente N.°</span> {String(patient.record_number).padStart(4, "0")}
        </p>
      </header>

      {balanceHasError ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="billing.balanceLoadError">
          No se pudo calcular el balance porque faltan datos de cargos o pagos.
        </p>
      ) : (
        <section aria-label="Resumen de facturación" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard labelKey="billing.summary.charged" label="Cargado al paciente" value={formatPesos(balance.patientCharged)} />
          <SummaryCard labelKey="billing.summary.paid" label="Pagado" value={formatPesos(balance.paid)} valueClass="text-emerald-700" />
          <SummaryCard
            labelKey={balance.balance < 0 ? "billing.summary.credit" : "billing.summary.balance"}
            label={balance.balance < 0 ? "Saldo a favor" : "Balance"}
            value={formatPesos(Math.abs(balance.balance))}
            valueClass={balance.balance < 0 ? "text-[#0766B5]" : "text-[#0F172A]"}
          />
          <SummaryCard labelKey="billing.summary.arsPending" label="Pendiente de la ARS" value={formatPesos(balance.arsPending)} />
        </section>
      )}

      {chargesResult.error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="billing.chargesLoadError">
          No se pudieron cargar los cargos.
        </p>
      )}
      {paymentsResult.error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="billing.paymentsLoadError">
          No se pudieron cargar los pagos.
        </p>
      )}

      {canManage && (
        <BillingForms
          chargeAction={addCharge.bind(null, patient.id)}
          paymentAction={addPayment.bind(null, patient.id)}
          arsName={arsName}
          procedures={unbilledProcedures}
          proceduresError={Boolean(planResult.error || chargesResult.error)}
        />
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="glass-card min-w-0 rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="billing.charges">Cargos</h2>
          {chargesResult.error ? null : charges.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500" data-i18n="billing.chargesEmpty">No hay cargos registrados.</p>
          ) : (
            <ul className="mt-3 flex min-w-0 flex-col gap-3">
              {charges.map((charge) => {
                const nextStatus = ARS_NEXT[charge.ars_status][0];
                return (
                  <li key={charge.id} className="min-w-0 rounded-xl border border-white/80 bg-white/55 p-3 sm:p-4">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className={`break-words text-[15px] font-bold text-[#0F172A] ${charge.voided_at ? "line-through opacity-60" : ""}`}>
                          {charge.description}
                        </p>
                        <p className={`mt-1 text-sm text-slate-700 ${charge.voided_at ? "line-through opacity-60" : ""}`}>
                          <span data-i18n="billing.amountShort">Monto</span>: {formatPesos(Number(charge.amount))}
                        </p>
                        <p className={`text-sm text-slate-700 ${charge.voided_at ? "line-through opacity-60" : ""}`}>
                          <span data-i18n="billing.arsCoverageShort">Cobertura ARS</span>: {formatPesos(Number(charge.ars_coverage))}
                        </p>
                        <p className={`text-sm font-semibold text-slate-800 ${charge.voided_at ? "line-through opacity-60" : ""}`}>
                          <span data-i18n="billing.patientAmount">Paga el paciente</span>: {formatPesos(Number(charge.patient_amount))}
                        </p>
                      </div>
                      <span
                        className={`inline-flex min-h-7 shrink-0 items-center self-start rounded-full border px-2.5 text-xs font-semibold ${charge.ars_status === "pagado" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#95D3FA] bg-[#95D3FA]/20 text-[#0766B5]"}`}
                        data-i18n={`billing.arsStatus.${charge.ars_status}`}
                      >
                        {ARS_STATUS_LABELS[charge.ars_status]}
                      </span>
                    </div>
                    {charge.ars_name && <p className="mt-2 break-words text-sm text-slate-600">{charge.ars_name}{charge.ars_authorization ? ` · ${charge.ars_authorization}` : ""}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      <span data-i18n="billing.created">Registrado</span>: {formatBillingDate(charge.created_at)} · {charge.creator?.full_name ?? <span data-i18n="billing.unknownUser">Usuario desconocido</span>}
                    </p>
                    {charge.voided_at && (
                      <p className="mt-2 break-words text-sm text-rose-700">
                        <span data-i18n="billing.voided">Anulado</span>: {formatBillingDate(charge.voided_at)} · <span data-i18n="billing.reason">Motivo</span>: {charge.void_reason}
                      </p>
                    )}
                    {canManage && !charge.voided_at && (
                      <div className="mt-2 flex min-w-0 flex-col gap-2">
                        {charge.ars_coverage && Number(charge.ars_coverage) > 0 && nextStatus && (
                          <ArsAdvanceForm
                            action={advanceArsClaim.bind(null, patient.id, charge.id, charge.ars_status, nextStatus)}
                            nextStatus={nextStatus}
                          />
                        )}
                        <VoidBillingForm action={voidCharge.bind(null, patient.id, charge.id)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="glass-card min-w-0 rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-bold text-[#0F172A]" data-i18n="billing.payments">Pagos</h2>
          {paymentsResult.error ? null : payments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500" data-i18n="billing.paymentsEmpty">No hay pagos registrados.</p>
          ) : (
            <ul className="mt-3 flex min-w-0 flex-col gap-3">
              {payments.map((payment) => (
                <li key={payment.id} className="min-w-0 rounded-xl border border-white/80 bg-white/55 p-3 sm:p-4">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className={`text-[15px] font-bold text-[#0F172A] ${payment.voided_at ? "line-through opacity-60" : ""}`}>
                        <span data-i18n="billing.receipt">Recibo N.°</span> {payment.receipt_number}
                      </p>
                      <p className={`mt-1 text-sm font-semibold text-slate-800 ${payment.voided_at ? "line-through opacity-60" : ""}`}>{formatPesos(Number(payment.amount))}</p>
                      <p className={`text-sm text-slate-600 ${payment.voided_at ? "line-through opacity-60" : ""}`} data-i18n={`billing.method.${payment.method}`}>
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">{formatBillingDate(payment.received_at)}</p>
                  </div>
                  {payment.reference && <p className="mt-2 break-words text-sm text-slate-600"><span data-i18n="billing.reference">Referencia</span>: {payment.reference}</p>}
                  {payment.note && <p className="mt-1 break-words text-sm text-slate-600"><span data-i18n="billing.note">Nota</span>: {payment.note}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    <span data-i18n="billing.receivedBy">Recibido por</span>: {payment.receiver?.full_name ?? <span data-i18n="billing.unknownUser">Usuario desconocido</span>}
                  </p>
                  {payment.voided_at && (
                    <p className="mt-2 break-words text-sm text-rose-700">
                      <span data-i18n="billing.voided">Anulado</span>: {formatBillingDate(payment.voided_at)} · <span data-i18n="billing.reason">Motivo</span>: {payment.void_reason}
                    </p>
                  )}
                  {canManage && !payment.voided_at && (
                    <VoidBillingForm action={voidPayment.bind(null, patient.id, payment.id)} payment />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {planResult.error && !canManage && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="billing.planLoadError">
          No se pudieron cargar los procedimientos completados.
        </p>
      )}
    </div>
  );
}