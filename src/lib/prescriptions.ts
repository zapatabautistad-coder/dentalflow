// Recetas (migración 027): validación con los mismos límites que la base.

export const MAX_PRESCRIPTION_ITEMS = 20;

export type PrescriptionItemInput = {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
};

export const ITEM_FIELDS = ["medication", "dose", "frequency", "duration", "quantity", "instructions"] as const;

const LIMITS: Record<(typeof ITEM_FIELDS)[number], number> = {
  medication: 200,
  dose: 100,
  frequency: 100,
  duration: 100,
  quantity: 50,
  instructions: 300,
};

export type ParsedPrescription =
  | { ok: true; items: PrescriptionItemInput[]; indications: string | null }
  | { ok: false; error: string };

// Filas del formulario (columnas alineadas por posición). Las filas totalmente
// vacías se ignoran; una fila con datos necesita el medicamento.
export function parsePrescription(rows: PrescriptionItemInput[], rawIndications: string): ParsedPrescription {
  const items: PrescriptionItemInput[] = [];

  for (const [index, row] of rows.entries()) {
    const item = Object.fromEntries(ITEM_FIELDS.map((field) => [field, (row[field] ?? "").trim()])) as PrescriptionItemInput;
    if (ITEM_FIELDS.every((field) => item[field] === "")) continue;

    const line = index + 1;
    if (item.medication.length < 2) {
      return { ok: false, error: `Escribe el medicamento de la línea ${line}.` };
    }
    for (const field of ITEM_FIELDS) {
      if (item[field].length > LIMITS[field]) {
        return { ok: false, error: `La línea ${line} tiene un texto demasiado largo (${FIELD_LABELS[field]}).` };
      }
    }
    items.push(item);
  }

  if (items.length === 0) return { ok: false, error: "Agrega al menos un medicamento." };
  if (items.length > MAX_PRESCRIPTION_ITEMS) {
    return { ok: false, error: `Una receta admite hasta ${MAX_PRESCRIPTION_ITEMS} medicamentos.` };
  }

  const indications = rawIndications.trim();
  if (indications.length > 1000) return { ok: false, error: "Las indicaciones admiten hasta 1000 caracteres." };

  return { ok: true, items, indications: indications || null };
}

export const FIELD_LABELS: Record<(typeof ITEM_FIELDS)[number], string> = {
  medication: "medicamento",
  dose: "dosis",
  frequency: "frecuencia",
  duration: "duración",
  quantity: "cantidad",
  instructions: "instrucciones",
};

// Mismo formato que el check de profiles.exequatur.
export function isValidExequatur(value: string): boolean {
  return /^[0-9A-Za-z./-]{1,30}$/.test(value);
}

export function isValidVoidReason(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 500;
}

// Mensajes de los triggers de la 027 que se pueden mostrar tal cual.
const KNOWN_DB_ERRORS = [
  "Solo un doctor activo puede recetar.",
  "Falta el exequátur del doctor. Pídele al administrador que lo registre en Cuentas.",
  "La cita no es de este paciente.",
  "Una receta no se edita: anúlala con motivo y haz otra.",
  "La receta necesita al menos un medicamento.",
  "Una receta admite hasta 20 medicamentos.",
];

export function prescriptionDbError(message: string | undefined, fallback: string): string {
  return message && KNOWN_DB_ERRORS.includes(message) ? message : fallback;
}

export type PrescriptionItem = {
  id: string;
  position: number;
  medication: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
};

export type Prescription = {
  id: string;
  indications: string | null;
  doctor_id: string | null;
  doctor_name: string;
  doctor_exequatur: string;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
  prescription_items: PrescriptionItem[];
};

export function formatPrescriptionDate(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function itemDetail(item: PrescriptionItem): string {
  return [item.dose, item.frequency, item.duration, item.quantity ? `Cant.: ${item.quantity}` : null]
    .filter(Boolean)
    .join(" · ");
}
