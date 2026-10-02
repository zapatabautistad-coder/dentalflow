import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewBilling, requireProfile } from "@/lib/auth";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/billing";
import { formatPesos } from "@/lib/treatment-plan";
import { TIME_ZONE } from "@/lib/timezone";
import { BillingLanguageBridge } from "../../billing-forms";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Recibo · DentalFlow" };

const CLINIC_NAME = process.env.NEXT_PUBLIC_CLINIC_NAME || "Bright Smile Dental";

type ReceiptPatient = {
  id: string;
  full_name: string;
  record_number: number;
};

type ReceiptPayment = {
  id: string;
  patient_id: string;
  receipt_number: number;
  amount: number | string;
  method: PaymentMethod;
  reference: string | null;
  received_at: string;
  voided_at: string | null;
  receiver: { full_name: string } | null;
};

function formatReceiptDate(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default async function BillingReceiptPage({
  params,
}: {
  params: Promise<{ id: string; numero: string }>;
}) {
  const { id: patientId, numero } = await params;
  const profile = await requireProfile();
  if (!canViewBilling(profile.role)) redirect(`/patients/${patientId}`);

  if (!/^\d+$/.test(numero)) notFound();
  const receiptNumber = Number(numero);
  if (!Number.isSafeInteger(receiptNumber) || receiptNumber < 1) notFound();

  const supabase = await createClient();
  const [patientResult, paymentResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, record_number")
      .eq("id", patientId)
      .maybeSingle<ReceiptPatient>(),
    supabase
      .from("billing_payments")
      .select("id, patient_id, receipt_number, amount, method, reference, received_at, voided_at, receiver:profiles!billing_payments_received_by_fkey(full_name)")
      .eq("patient_id", patientId)
      .eq("receipt_number", receiptNumber)
      .maybeSingle<ReceiptPayment>(),
  ]);

  if (patientResult.error || paymentResult.error) {
    return (
      <>
        <BillingLanguageBridge />
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="billing.receipt.loadError">
          No se pudo cargar el recibo.
        </p>
      </>
    );
  }

  const patient = patientResult.data;
  const payment = paymentResult.data;
  if (!patient || !payment) notFound();

  return (
    <div className="billing-receipt-page mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4">
      <BillingLanguageBridge />
      <div className="receipt-print-hidden flex justify-end">
        <PrintButton />
      </div>

      <article className="billing-receipt-sheet crystal-card w-full min-w-0 rounded-2xl p-5 sm:p-8">
        {payment.voided_at && (
          <p className="mb-5 text-center text-4xl font-black uppercase tracking-[0.08em] text-rose-700" data-i18n="billing.receipt.voided">
            ANULADO
          </p>
        )}

        <header className="border-b border-[#95D3FA]/70 pb-5 text-center">
          <p className="break-words text-lg font-bold text-[#0766B5]">{CLINIC_NAME}</p>
          <h1 className="mt-2 text-2xl font-black text-[#0F172A]" data-i18n="billing.receipt.title">Recibo</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            <span data-i18n="billing.receipt.number">N.° de recibo</span> {payment.receipt_number}
          </p>
        </header>

        <dl className="mt-5 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.receipt.patient">Paciente</dt>
            <dd className="mt-1 break-words text-[15px] font-semibold text-[#0F172A]">{patient.full_name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="chart.recordNo">Expediente N.°</dt>
            <dd className="mt-1 text-[15px] font-semibold text-[#0F172A]">{String(patient.record_number).padStart(4, "0")}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.receipt.date">Fecha</dt>
            <dd className="mt-1 break-words text-[15px] text-slate-700">{formatReceiptDate(payment.received_at)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.amountShort">Monto</dt>
            <dd className="mt-1 text-lg font-black text-[#0766B5]">{formatPesos(Number(payment.amount))}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.paymentMethod">Forma de pago</dt>
            <dd className="mt-1 text-[15px] text-slate-700" data-i18n={`billing.method.${payment.method}`}>
              {PAYMENT_METHOD_LABELS[payment.method]}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.receipt.receivedBy">Recibido por</dt>
            <dd className="mt-1 break-words text-[15px] text-slate-700">
              {payment.receiver?.full_name ?? <span data-i18n="billing.unknownUser">Usuario desconocido</span>}
            </dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.reference">Referencia</dt>
            <dd className="mt-1 break-words text-[15px] text-slate-700">
              {payment.reference || <span data-i18n="billing.receipt.noReference">Sin referencia registrada</span>}
            </dd>
          </div>
        </dl>

        <footer className="mt-7 border-t border-[#95D3FA]/50 pt-4 text-center text-xs text-slate-500" data-i18n="billing.receipt.footer">
          Comprobante de pago
        </footer>
      </article>
    </div>
  );
}
