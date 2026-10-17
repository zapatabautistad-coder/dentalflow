// Validación determinista de los borradores de la IA (pendientes/18-ia-ambiental.md, capa 4).
// Corre antes de guardar en ai_drafts y otra vez cuando el doctor acepta (con sus cambios).
// Lo inválido no se "arregla": se devuelve el error para que la IA pregunte al doctor.

import { validateDictation } from "../dictation";
import { isValidTooth, SURFACES, type OdontogramCondition, type Surface } from "../odontogram";
import { parseVitalSignsInput, type VitalSignsInputErrorKey } from "../vital-signs";

export type DraftKind = "odontograma" | "nota" | "signos" | "plan" | "pregunta";

export type OdontogramDraft = { tooth: number; surfaces: Surface[] | null; condition: OdontogramCondition; note: string | null };
export type NoteDraft = { body: string };
export type VitalSignsDraft = {
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  glucose_mg_dl: number | null;
  oxygen_saturation: number | null;
  note: string | null;
};
export type PlanDraft = { procedure: string; tooth: number | null; surfaces: Surface[] | null; note: string | null };
export type QuestionDraft = { question: string };

export type DraftPayload = {
  odontograma: OdontogramDraft;
  nota: NoteDraft;
  signos: VitalSignsDraft;
  plan: PlanDraft;
  pregunta: QuestionDraft;
};

export type DraftResult<K extends DraftKind> = { ok: true; payload: DraftPayload[K] } | { ok: false; error: string };

const MAX_NOTE_BODY = 4000;
const MAX_SHORT_NOTE = 500;
const MAX_QUESTION = 300;

const VITAL_ERRORS: Record<VitalSignsInputErrorKey, string> = {
  "vitalSigns.error.systolic": "La sistólica debe ser un entero entre 60 y 260.",
  "vitalSigns.error.diastolic": "La diastólica debe ser un entero entre 30 y 160.",
  "vitalSigns.error.heartRate": "El pulso debe ser un entero entre 30 y 220.",
  "vitalSigns.error.glucose": "La glucemia debe ser un entero entre 20 y 600 mg/dL.",
  "vitalSigns.error.oxygenSaturation": "La saturación debe ser un entero entre 50 y 100.",
  "vitalSigns.error.pressurePair": "La presión lleva sistólica y diastólica juntas.",
  "vitalSigns.error.pressureOrder": "La sistólica debe ser mayor que la diastólica.",
  "vitalSigns.error.someValue": "Falta al menos un valor.",
  "vitalSigns.error.noteLength": "La nota admite hasta 500 caracteres.",
};

function isObject(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === "object" && !Array.isArray(raw);
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text.length > max) return undefined;
  return text || null;
}

function measurement(value: unknown): string | undefined {
  if (value === null || value === undefined) return "";
  if (typeof value !== "number") return undefined;
  return String(value);
}

export function validateOdontogramDraft(raw: unknown): DraftResult<"odontograma"> {
  if (!isObject(raw)) return { ok: false, error: "Hallazgo inválido." };
  const result = validateDictation({ findings: [raw], questions: [] });
  if (!result.ok) return { ok: false, error: result.error };
  const [finding] = result.proposal.findings;
  if (!finding) return { ok: false, error: result.proposal.questions[0] ?? "Hallazgo inválido." };
  return { ok: true, payload: finding };
}

export function validateNoteDraft(raw: unknown): DraftResult<"nota"> {
  if (!isObject(raw)) return { ok: false, error: "Nota inválida." };
  const body = optionalText(raw.body, MAX_NOTE_BODY);
  if (!body) return { ok: false, error: `La nota no puede estar vacía ni pasar de ${MAX_NOTE_BODY} caracteres.` };
  return { ok: true, payload: { body } };
}

export function validateVitalSignsDraft(raw: unknown): DraftResult<"signos"> {
  if (!isObject(raw)) return { ok: false, error: "Signos vitales inválidos." };
  const fields = ["systolic", "diastolic", "heart_rate", "glucose_mg_dl", "oxygen_saturation"] as const;
  const text: Record<(typeof fields)[number], string> = { systolic: "", diastolic: "", heart_rate: "", glucose_mg_dl: "", oxygen_saturation: "" };
  for (const field of fields) {
    const value = measurement(raw[field]);
    if (value === undefined) return { ok: false, error: `${field} debe ser un número o null.` };
    text[field] = value;
  }
  const note = raw.note === null || raw.note === undefined ? "" : raw.note;
  if (typeof note !== "string") return { ok: false, error: "La nota debe ser texto o null." };

  const parsed = parseVitalSignsInput({ ...text, note });
  if (!parsed.ok) return { ok: false, error: VITAL_ERRORS[parsed.errorKey] };
  return { ok: true, payload: parsed.values };
}

export function validatePlanDraft(raw: unknown): DraftResult<"plan"> {
  if (!isObject(raw)) return { ok: false, error: "Procedimiento inválido." };
  const procedure = typeof raw.procedure === "string" ? raw.procedure.trim() : "";
  if (procedure.length < 2 || procedure.length > 200) {
    return { ok: false, error: "El procedimiento debe tener entre 2 y 200 caracteres." };
  }

  let tooth: number | null = null;
  if (raw.tooth !== null && raw.tooth !== undefined) {
    if (typeof raw.tooth !== "number" || !isValidTooth(raw.tooth)) {
      return { ok: false, error: "El diente debe ser un número FDI válido o null." };
    }
    tooth = raw.tooth;
  }

  let surfaces: Surface[] | null = null;
  if (Array.isArray(raw.surfaces) && raw.surfaces.length > 0) {
    if (tooth === null) return { ok: false, error: "Las superficies requieren un diente." };
    const unique = [...new Set(raw.surfaces)];
    if (!unique.every((s): s is Surface => (SURFACES as unknown[]).includes(s))) {
      return { ok: false, error: "Superficie inválida (usa M, D, O, V o L)." };
    }
    surfaces = unique;
  } else if (raw.surfaces !== null && raw.surfaces !== undefined && !Array.isArray(raw.surfaces)) {
    return { ok: false, error: "Las superficies deben ser una lista o null." };
  }

  const note = optionalText(raw.note, MAX_SHORT_NOTE);
  if (note === undefined) return { ok: false, error: `La nota admite hasta ${MAX_SHORT_NOTE} caracteres.` };
  return { ok: true, payload: { procedure, tooth, surfaces, note } };
}

export function validateQuestionDraft(raw: unknown): DraftResult<"pregunta"> {
  if (!isObject(raw)) return { ok: false, error: "Pregunta inválida." };
  const question = optionalText(raw.question, MAX_QUESTION);
  if (!question) return { ok: false, error: `La pregunta no puede estar vacía ni pasar de ${MAX_QUESTION} caracteres.` };
  return { ok: true, payload: { question } };
}

const VALIDATORS: { [K in DraftKind]: (raw: unknown) => DraftResult<K> } = {
  odontograma: validateOdontogramDraft,
  nota: validateNoteDraft,
  signos: validateVitalSignsDraft,
  plan: validatePlanDraft,
  pregunta: validateQuestionDraft,
};

export function validateDraft<K extends DraftKind>(kind: K, raw: unknown): DraftResult<K> {
  return VALIDATORS[kind](raw);
}

// Quién firma cada borrador (igual que el trigger stamp_ai_draft de la 036).
export function canDecideDraft(role: string, kind: DraftKind): boolean {
  return role === "doctor" || (role === "enfermeria" && kind === "signos");
}
