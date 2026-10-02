// Odontograma: numeración FDI, condiciones y cálculo del estado actual de
// cada diente a partir del historial de entradas (que nunca se borra).

export type Surface = "M" | "D" | "O" | "V" | "L";
export type SurfaceCondition = "caries" | "obturacion" | "sellante";
export type ToothCondition = "corona" | "endodoncia" | "fractura" | "extraccion_indicada" | "ausente" | "implante";
export type OdontogramCondition = "sano" | SurfaceCondition | ToothCondition;

export type OdontogramEntry = {
  id: string;
  tooth: number;
  surfaces: Surface[] | null;
  condition: OdontogramCondition | null;
  note: string | null;
  corrects_entry_id: string | null;
  correction_reason: string | null;
  created_at: string;
};

export type ToothState = {
  surfaces: Partial<Record<Surface, SurfaceCondition>>;
  whole: ToothCondition[];
};

export const SURFACES: Surface[] = ["V", "M", "O", "D", "L"];
export const SURFACE_CONDITIONS: SurfaceCondition[] = ["caries", "obturacion", "sellante"];
export const TOOTH_CONDITIONS: ToothCondition[] = ["corona", "endodoncia", "fractura", "extraccion_indicada", "ausente", "implante"];

export const CONDITION_LABELS: Record<OdontogramCondition, string> = {
  sano: "Sano",
  caries: "Caries",
  obturacion: "Obturación",
  sellante: "Sellante",
  corona: "Corona",
  endodoncia: "Endodoncia",
  fractura: "Fractura",
  extraccion_indicada: "Extracción indicada",
  ausente: "Ausente",
  implante: "Implante",
};

export const SURFACE_LABELS: Record<Surface, string> = {
  M: "Mesial",
  D: "Distal",
  O: "Oclusal / incisal",
  V: "Vestibular",
  L: "Lingual / palatino",
};

// Arcadas en el orden en que se dibujan (vista del dentista: la derecha del
// paciente queda a la izquierda).
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const PRIMARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PRIMARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export function isValidTooth(tooth: number): boolean {
  if (!Number.isInteger(tooth)) return false;
  const quadrant = Math.floor(tooth / 10);
  const position = tooth % 10;
  if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8;
  if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5;
  return false;
}

export function isSurfaceCondition(condition: OdontogramCondition): condition is SurfaceCondition {
  return (SURFACE_CONDITIONS as string[]).includes(condition);
}

// Entradas vigentes: sin las que fueron anuladas o corregidas, y sin las
// anulaciones en sí (no traen hallazgo). Orden cronológico.
export function activeEntries(entries: OdontogramEntry[]): OdontogramEntry[] {
  const corrected = new Set(entries.map((entry) => entry.corrects_entry_id).filter(Boolean));
  return entries
    .filter((entry) => entry.condition !== null && !corrected.has(entry.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function emptyState(): ToothState {
  return { surfaces: {}, whole: [] };
}

// Estado actual por diente. Reglas:
// - "sano" reinicia el diente.
// - Caries, obturación y sellante: en cada superficie vale el último hallazgo.
// - Ausente e implante reemplazan todo lo anterior del diente.
// - Corona cubre las superficies (las limpia) y se suma a lo demás.
// - Endodoncia, fractura y extracción indicada se suman.
export function computeOdontogram(entries: OdontogramEntry[]): Map<number, ToothState> {
  const state = new Map<number, ToothState>();

  for (const entry of activeEntries(entries)) {
    const condition = entry.condition as OdontogramCondition;
    const current = state.get(entry.tooth) ?? emptyState();

    if (condition === "sano") {
      state.set(entry.tooth, emptyState());
      continue;
    }

    if (isSurfaceCondition(condition)) {
      for (const surface of entry.surfaces ?? []) current.surfaces[surface] = condition;
    } else if (condition === "ausente" || condition === "implante") {
      current.surfaces = {};
      current.whole = [condition];
    } else {
      if (condition === "corona") current.surfaces = {};
      if (!current.whole.includes(condition)) current.whole = [...current.whole, condition];
    }

    state.set(entry.tooth, current);
  }

  return state;
}
