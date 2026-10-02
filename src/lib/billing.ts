// Facturación: etiquetas y cálculo del balance del paciente.
// Las reglas (montos válidos, anulación, recibo) las impone la base (020).

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "cheque";
export type ArsClaimStatus = "no_aplica" | "pendiente" | "reclamado" | "pagado" | "rechazado";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  cheque: "Cheque",
};

export const ARS_STATUS_LABELS: Record<ArsClaimStatus, string> = {
  no_aplica: "Sin ARS",
  pendiente: "Pendiente de reclamar",
  reclamado: "Reclamado",
  pagado: "Pagado por la ARS",
  rechazado: "Rechazado por la ARS",
};

// Siguiente paso permitido del reclamo a la ARS.
export const ARS_NEXT: Record<ArsClaimStatus, ArsClaimStatus[]> = {
  no_aplica: [],
  pendiente: ["reclamado"],
  reclamado: ["pagado", "rechazado"],
  pagado: [],
  rechazado: [],
};

type Money = number | string | null;
export type ChargeForBalance = { amount: Money; ars_coverage: Money; patient_amount: Money; ars_status: ArsClaimStatus; voided_at: string | null };
export type PaymentForBalance = { amount: Money; voided_at: string | null };

const n = (value: Money) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const round = (value: number) => Math.round(value * 100) / 100;

// Lo anulado no cuenta. Si la ARS rechaza el reclamo, esa cobertura pasa a
// ser deuda del paciente.
export function patientBalance(charges: ChargeForBalance[], payments: PaymentForBalance[]) {
  let charged = 0;
  let arsPending = 0;
  let arsRejected = 0;
  for (const charge of charges) {
    if (charge.voided_at) continue;
    charged += n(charge.patient_amount);
    if (charge.ars_status === "rechazado") arsRejected += n(charge.ars_coverage);
    else if (charge.ars_status === "pendiente" || charge.ars_status === "reclamado") arsPending += n(charge.ars_coverage);
  }
  const paid = payments.filter((payment) => !payment.voided_at).reduce((sum, payment) => sum + n(payment.amount), 0);
  const patientOwes = charged + arsRejected;
  return {
    patientCharged: round(patientOwes),
    paid: round(paid),
    balance: round(patientOwes - paid),
    arsPending: round(arsPending),
  };
}
