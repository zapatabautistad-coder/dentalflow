import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getMyClinic } from "@/lib/clinic";
import { formatDominicanDocumentId } from "@/lib/phone";
import { BillingLanguageBridge } from "../../facturacion/billing-forms";
import { PrintButton } from "../../facturacion/recibo/[numero]/print-button";
import { formatPrescriptionDate, itemDetail, type Prescription } from "@/lib/prescriptions";

export const metadata: Metadata = { title: "Receta · DentalFlow" };

type RxPatient = { id: string; full_name: string; record_number: number; document_id: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PrescriptionPrintPage({
  params,
}: {
  params: Promise<{ id: string; recetaId: string }>;
}) {
  const [{ id: patientId, recetaId }] = await Promise.all([params, requireProfile()]);
  if (!UUID.test(recetaId)) notFound();

  const supabase = await createClient();
  const [patientResult, rxResult, clinic] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, record_number, document_id")
      .eq("id", patientId)
      .maybeSingle<RxPatient>(),
    supabase
      .from("prescriptions")
      .select(
        "id, indications, doctor_id, doctor_name, doctor_exequatur, created_at, voided_at, void_reason, prescription_items(id, position, medication, dose, frequency, duration, quantity, instructions)"
      )
      .eq("id", recetaId)
      .eq("patient_id", patientId)
      .maybeSingle<Prescription>(),
    getMyClinic(),
  ]);

  if (patientResult.error || rxResult.error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="rx.printLoadError">
        No se pudo cargar la receta.
      </p>
    );
  }
  const patient = patientResult.data;
  const rx = rxResult.data;
  if (!patient || !rx) notFound();

  const items = [...rx.prescription_items].sort((a, b) => a.position - b.position);

  return (
    <div className="billing-receipt-page mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4">
      <BillingLanguageBridge />
      <div className="receipt-print-hidden flex justify-end">
        <PrintButton />
      </div>

      <article className="billing-receipt-sheet crystal-card w-full min-w-0 rounded-2xl p-5 sm:p-8">
        {rx.voided_at && (
          <p className="mb-5 text-center text-4xl font-black uppercase tracking-[0.08em] text-rose-700" data-i18n="rx.voidedBig">
            ANULADA
          </p>
        )}

        <header className="border-b border-[#95D3FA]/70 pb-5 text-center">
          {clinic?.name && <p className="break-words text-lg font-bold text-[#0766B5]">{clinic.name}</p>}
          {clinic?.address && <p className="mt-1 break-words text-sm text-slate-600">{clinic.address}</p>}
          {clinic?.phone && (
            <p className="mt-1 break-words text-sm text-slate-600">
              <span data-i18n="billing.receipt.phone">Teléfono</span>: {clinic.phone}
            </p>
          )}
          <h1 className="mt-2 text-2xl font-black text-[#0F172A]" data-i18n="rx.printTitle">Receta</h1>
        </header>

        <dl className="mt-5 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.receipt.patient">Paciente</dt>
            <dd className="mt-1 break-words text-[15px] font-semibold text-[#0F172A]">{patient.full_name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="rx.document">Cédula</dt>
            <dd className="mt-1 text-[15px] text-slate-700">
              {patient.document_id ? formatDominicanDocumentId(patient.document_id) : "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="chart.recordNo">Expediente N.°</dt>
            <dd className="mt-1 text-[15px] text-slate-700">{String(patient.record_number).padStart(4, "0")}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="billing.receipt.date">Fecha</dt>
            <dd className="mt-1 text-[15px] text-slate-700">{formatPrescriptionDate(rx.created_at)}</dd>
          </div>
        </dl>

        <section className="mt-6">
          <p className="text-3xl font-black text-[#0766B5]">℞</p>
          <ol className="mt-2 flex list-decimal flex-col gap-3 pl-6 text-[15px] text-[#0F172A]">
            {items.map((item) => (
              <li key={item.id} className="break-words">
                <span className="font-semibold">{item.medication}</span>
                {itemDetail(item) && <span className="block text-slate-700">{itemDetail(item)}</span>}
                {item.instructions && <span className="block text-slate-600">{item.instructions}</span>}
              </li>
            ))}
          </ol>
          {rx.indications && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500" data-i18n="rx.indicationsPrint">Indicaciones</p>
              <p className="mt-1 whitespace-pre-line break-words text-[15px] text-slate-700">{rx.indications}</p>
            </div>
          )}
        </section>

        <footer className="mt-12 flex flex-col items-center text-center">
          <span className="block h-px w-64 max-w-full bg-slate-400" />
          <p className="mt-2 break-words text-[15px] font-semibold text-[#0F172A]">{rx.doctor_name}</p>
          <p className="text-sm text-slate-600">
            <span data-i18n="rx.exequatur">Exequátur</span> {rx.doctor_exequatur}
          </p>
          {rx.voided_at && rx.void_reason && (
            <p className="mt-4 break-words text-sm text-rose-700">
              <span data-i18n="rx.voidReasonLabel">Motivo de anulación:</span> {rx.void_reason}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
