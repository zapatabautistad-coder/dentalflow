// Dictado por voz → odontograma (IA nº 1). La IA solo PROPONE: este módulo
// revisa su respuesta antes de que el doctor la vea, y el doctor confirma y
// firma con el flujo normal del odontograma. Nada de lo que diga la IA se guarda
// sin pasar por aquí y sin la confirmación del doctor.

import {
  CONDITION_LABELS,
  isSurfaceCondition,
  isValidTooth,
  SURFACES,
  type OdontogramCondition,
  type Surface,
} from "./odontogram";

export type DictationFinding = {
  tooth: number;
  surfaces: Surface[] | null;
  condition: OdontogramCondition;
  note: string | null;
};

export type DictationProposal = {
  findings: DictationFinding[];
  // Preguntas para el doctor cuando algo no quedó claro (nunca se adivina).
  questions: string[];
};

export type DictationResult = { ok: true; proposal: DictationProposal } | { ok: false; error: string };

export const MAX_DICTATION_FINDINGS = 32;
const MAX_NOTE = 500;
const MAX_QUESTION = 300;

const CONDITIONS = Object.keys(CONDITION_LABELS) as OdontogramCondition[];

function isCondition(value: unknown): value is OdontogramCondition {
  return typeof value === "string" && (CONDITIONS as string[]).includes(value);
}

// Revisa la respuesta cruda de la IA (JSON ya parseado). Lo inválido no se
// "arregla": se convierte en una pregunta para el doctor.
export function validateDictation(raw: unknown): DictationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "La IA no devolvió una propuesta válida." };
  const input = raw as { findings?: unknown; questions?: unknown };
  if (!Array.isArray(input.findings)) return { ok: false, error: "La IA no devolvió una propuesta válida." };

  const findings: DictationFinding[] = [];
  const questions: string[] = Array.isArray(input.questions)
    ? input.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).map((q) => q.trim().slice(0, MAX_QUESTION))
    : [];

  for (const item of input.findings.slice(0, MAX_DICTATION_FINDINGS)) {
    if (!item || typeof item !== "object") continue;
    const f = item as { tooth?: unknown; surfaces?: unknown; condition?: unknown; note?: unknown };

    const tooth = typeof f.tooth === "number" ? f.tooth : Number.NaN;
    if (!Number.isInteger(tooth) || !isValidTooth(tooth)) {
      questions.push(`No entendí el diente${f.tooth != null ? ` "${String(f.tooth).slice(0, 10)}"` : ""}. Indica el número FDI.`);
      continue;
    }
    if (!isCondition(f.condition)) {
      questions.push(`Diente ${tooth}: no entendí el hallazgo. ¿Qué condición registro?`);
      continue;
    }

    const rawSurfaces = Array.isArray(f.surfaces) ? f.surfaces : [];
    const surfaces = [...new Set(rawSurfaces)].filter((s): s is Surface => (SURFACES as unknown[]).includes(s));
    if (rawSurfaces.length !== surfaces.length && rawSurfaces.length > 0) {
      questions.push(`Diente ${tooth}: alguna superficie no es válida (usa M, D, O, V o L).`);
      continue;
    }

    if (isSurfaceCondition(f.condition) && surfaces.length === 0) {
      questions.push(`Diente ${tooth}: ¿en qué superficie está la ${CONDITION_LABELS[f.condition].toLowerCase()}?`);
      continue;
    }

    const note = typeof f.note === "string" && f.note.trim() ? f.note.trim().slice(0, MAX_NOTE) : null;
    findings.push({
      tooth,
      surfaces: isSurfaceCondition(f.condition) ? surfaces : null,
      condition: f.condition,
      note,
    });
  }

  if (findings.length === 0 && questions.length === 0) {
    return { ok: false, error: "No encontré hallazgos en el dictado." };
  }
  return { ok: true, proposal: { findings, questions } };
}
