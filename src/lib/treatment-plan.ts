// Plan de tratamiento: estados, pasos permitidos y totales en RD$.
// Los pasos válidos los impone también la base (trigger de la 019).

export type TreatmentStatus = "pendiente" | "en_proceso" | "completado" | "cancelado";

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completado: "Completado",
  cancelado: "Cancelado",
};

const NEXT_STATUSES: Record<TreatmentStatus, TreatmentStatus[]> = {
  pendiente: ["en_proceso", "completado", "cancelado"],
  en_proceso: ["completado", "cancelado"],
  completado: [],
  cancelado: [],
};

export function canMoveTreatment(from: TreatmentStatus, to: TreatmentStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

// Procedimientos frecuentes para sugerir al escribir (el doctor puede
// escribir cualquier otro).
export const COMMON_PROCEDURES = [
  "Profilaxis (limpieza)",
  "Resina compuesta",
  "Amalgama",
  "Sellante de fosas y fisuras",
  "Endodoncia",
  "Corona de porcelana",
  "Corona de zirconio",
  "Extracción simple",
  "Extracción de cordal",
  "Implante dental",
  "Blanqueamiento",
  "Raspado y alisado radicular",
  "Ortodoncia (evaluación)",
  "Radiografía periapical",
];

type CostItem = { status: TreatmentStatus; estimated_cost: number | string | null };

// Totales del plan. Lo cancelado no suma. Costos sin valor cuentan como 0.
export function treatmentTotals(items: CostItem[]) {
  let pending = 0;
  let done = 0;
  for (const item of items) {
    const cost = Number(item.estimated_cost ?? 0);
    if (!Number.isFinite(cost)) continue;
    if (item.status === "completado") done += cost;
    else if (item.status !== "cancelado") pending += cost;
  }
  return { pending, done, total: pending + done };
}

export function formatPesos(value: number): string {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 2 }).format(value);
}

// "1,500.50" / "1500" / "RD$ 2,000" → número; vacío → null; inválido → NaN.
export function parseCost(raw: string): number | null {
  const cleaned = raw.replace(/RD\$|\$|\s|,/gi, "");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

// Condición del odontograma que corresponde a un procedimiento terminado,
// para sugerirla al marcarlo completado. Las de superficie solo si el
// procedimiento tiene superficies. null = sin sugerencia.
export function suggestOdontogramCondition(
  procedure: string,
  hasSurfaces: boolean
): "obturacion" | "sellante" | "endodoncia" | "corona" | "ausente" | "implante" | null {
  const text = procedure
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/implante|implant/.test(text)) return "implante";
  if (/extracc|exodoncia|cordal|extraction|wisdom/.test(text)) return "ausente";
  if (/endodon|conducto|root canal/.test(text)) return "endodoncia";
  if (/corona|crown/.test(text)) return "corona";
  if (!hasSurfaces) return null;
  if (/sellante|sealant/.test(text)) return "sellante";
  if (/resina|amalgama|obturac|incrustac|composite|filling/.test(text)) return "obturacion";
  return null;
}
