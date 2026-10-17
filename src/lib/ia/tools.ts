// Herramientas de la IA (pendientes/18-ia-ambiental.md, capa 3). Corren en el servidor con el
// cliente de Supabase del usuario logueado: todo pasa por RLS y triggers.
// - Ninguna recibe el paciente como parámetro: están atadas al paciente y la consulta de la sesión.
// - Las de lectura usan columnas explícitas y no envían nombre, cédula ni contacto del paciente.
// - Las de propuesta solo escriben en ai_drafts. Ninguna toca tablas clínicas ni recetas.

import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@/lib/supabase/server";
import { medicalAlerts, MEDICAL_ALERT_LABELS } from "@/lib/medical-alerts";
import { computeOdontogram, CONDITION_LABELS, SURFACES, type OdontogramEntry } from "@/lib/odontogram";
import { currentVitalSigns } from "@/lib/vital-signs";
import { validateDraft, type DraftKind } from "./drafts";

export type IaScope = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  patientId: string;
  encounterId: string;
  sessionId: string;
};

export type ToolOutcome = { content: string; isError: boolean; draftId?: string };

export const MAX_DRAFTS_PER_SESSION = 40;

const CONDITIONS = Object.keys(CONDITION_LABELS);
const NULLABLE_SURFACES = {
  anyOf: [
    { type: "array", items: { type: "string", enum: SURFACES }, minItems: 1, maxItems: 5 },
    { type: "null" },
  ],
  description: "Superficies M, D, O, V, L. null si no aplica.",
};
const NO_INPUT = { type: "object" as const, properties: {}, required: [], additionalProperties: false };

// Orden fijo: cambiarlo invalida la caché de prompt.
export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = [
  { name: "leer_paciente", description: "Edad, antecedentes, alergias y medicación habitual del paciente de la consulta.", input_schema: NO_INPUT },
  { name: "leer_odontograma", description: "Estado actual de cada diente con hallazgos registrados.", input_schema: NO_INPUT },
  { name: "leer_historial", description: "Últimas 30 entradas del registro clínico (notas, procedimientos, medicamentos administrados).", input_schema: NO_INPUT },
  { name: "leer_signos", description: "Últimas 5 tomas vigentes de signos vitales.", input_schema: NO_INPUT },
  { name: "leer_plan", description: "Plan de tratamiento vigente (sin lo cancelado).", input_schema: NO_INPUT },
  { name: "leer_recetas", description: "Últimas 5 recetas vigentes con sus medicamentos.", input_schema: NO_INPUT },
  {
    name: "proponer_hallazgo_odontograma",
    description: "Propone un hallazgo del odontograma (un diente). Queda como borrador hasta que el doctor lo firme.",
    input_schema: {
      type: "object",
      properties: {
        tooth: { type: "integer", description: "Diente FDI (11–48, 51–85)." },
        surfaces: NULLABLE_SURFACES,
        condition: { type: "string", enum: CONDITIONS },
        note: { type: ["string", "null"], description: "Nota breve (máx. 500) o null." },
      },
      required: ["tooth", "surfaces", "condition", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "proponer_nota",
    description: "Propone una nota clínica de la consulta con lo dictado, en lenguaje clínico conciso.",
    input_schema: {
      type: "object",
      properties: { body: { type: "string", description: "Texto de la nota (máx. 4000)." } },
      required: ["body"],
      additionalProperties: false,
    },
  },
  {
    name: "proponer_signos",
    description: "Propone una toma de signos vitales con los valores dictados. null en lo que no se dijo.",
    input_schema: {
      type: "object",
      properties: {
        systolic: { type: ["integer", "null"] },
        diastolic: { type: ["integer", "null"] },
        heart_rate: { type: ["integer", "null"] },
        glucose_mg_dl: { type: ["integer", "null"] },
        oxygen_saturation: { type: ["integer", "null"] },
        note: { type: ["string", "null"] },
      },
      required: ["systolic", "diastolic", "heart_rate", "glucose_mg_dl", "oxygen_saturation", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "proponer_item_plan",
    description: "Propone un procedimiento para el plan de tratamiento. Sin costo: lo pone el doctor.",
    input_schema: {
      type: "object",
      properties: {
        procedure: { type: "string", description: "Procedimiento (2–200 caracteres)." },
        tooth: { type: ["integer", "null"], description: "Diente FDI o null." },
        surfaces: NULLABLE_SURFACES,
        note: { type: ["string", "null"] },
      },
      required: ["procedure", "tooth", "surfaces", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "preguntar_al_doctor",
    description: "Pregunta al doctor cuando algo del dictado es ambiguo. Úsala en vez de adivinar.",
    input_schema: {
      type: "object",
      properties: { question: { type: "string", description: "Pregunta breve (máx. 300)." } },
      required: ["question"],
      additionalProperties: false,
    },
  },
].map((tool) => ({ ...tool, strict: true, eager_input_streaming: true }) as Anthropic.Beta.BetaTool);

const PROPOSAL_KIND: Record<string, DraftKind> = {
  proponer_hallazgo_odontograma: "odontograma",
  proponer_nota: "nota",
  proponer_signos: "signos",
  proponer_item_plan: "plan",
  preguntar_al_doctor: "pregunta",
};

const READ_FAILED = "No se pudo leer. Continúa sin este dato y, si lo necesitas, pregunta al doctor.";

function ageFrom(birthDate: string | null, now = new Date()): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export async function readPatient({ supabase, patientId }: IaScope): Promise<string | null> {
  const [patient, history] = await Promise.all([
    supabase.from("patients").select("birth_date").eq("id", patientId).single(),
    supabase
      .from("patient_medical_history")
      .select(
        "allergy_penicillin, allergy_local_anesthetic, allergy_latex, allergy_nsaids, allergies_other, takes_anticoagulants, takes_bisphosphonates, current_medications, has_diabetes, has_hypertension, has_heart_disease, is_pregnant, conditions_other"
      )
      .eq("patient_id", patientId)
      .maybeSingle(),
  ]);
  if (patient.error || history.error) return null;
  const alerts = medicalAlerts(history.data).map((a) => MEDICAL_ALERT_LABELS[a.key].es + (a.detail ? `: ${a.detail}` : ""));
  return JSON.stringify({
    edad: ageFrom(patient.data.birth_date),
    alertas: alerts,
    otras_alergias: history.data?.allergies_other ?? null,
    medicacion_habitual: history.data?.current_medications ?? null,
    otras_condiciones: history.data?.conditions_other ?? null,
    antecedentes_registrados: history.data !== null,
  });
}

export async function readOdontogram({ supabase, patientId }: IaScope): Promise<string | null> {
  const { data, error } = await supabase
    .from("odontogram_entries")
    .select("id, tooth, surfaces, condition, note, corrects_entry_id, correction_reason, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) return null;
  const state = computeOdontogram(data as OdontogramEntry[]);
  const teeth = [...state.entries()]
    .filter(([, tooth]) => tooth.whole.length > 0 || Object.keys(tooth.surfaces).length > 0)
    .sort(([a], [b]) => a - b)
    .map(([tooth, s]) => ({ diente: tooth, superficies: s.surfaces, diente_completo: s.whole }));
  return JSON.stringify({ dientes_con_hallazgos: teeth });
}

export async function readClinicalHistory({ supabase, patientId }: IaScope): Promise<string | null> {
  const { data, error } = await supabase
    .from("clinical_entries")
    .select("id, kind, body, medication_name, dose, route, administered_at, corrects_entry_id, correction_reason, author_role, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return null;
  return JSON.stringify({ entradas: data });
}

export async function readVitalSigns({ supabase, patientId }: IaScope): Promise<string | null> {
  const { data, error } = await supabase
    .from("vital_signs")
    .select("id, systolic, diastolic, heart_rate, glucose_mg_dl, oxygen_saturation, note, corrects_entry_id, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return null;
  return JSON.stringify({ tomas: currentVitalSigns(data).slice(0, 5) });
}

export async function readPlan({ supabase, patientId }: IaScope): Promise<string | null> {
  const { data, error } = await supabase
    .from("treatment_plan_items")
    .select("id, tooth, surfaces, procedure, status, note, created_at")
    .eq("patient_id", patientId)
    .neq("status", "cancelado")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return null;
  return JSON.stringify({ procedimientos: data });
}

export async function readPrescriptions({ supabase, patientId }: IaScope): Promise<string | null> {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, created_at, indications, prescription_items(position, medication, dose, frequency, duration)")
    .eq("patient_id", patientId)
    .is("voided_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return null;
  return JSON.stringify({ recetas: data });
}

const READERS: Record<string, (scope: IaScope) => Promise<string | null>> = {
  leer_paciente: readPatient,
  leer_odontograma: readOdontogram,
  leer_historial: readClinicalHistory,
  leer_signos: readVitalSigns,
  leer_plan: readPlan,
  leer_recetas: readPrescriptions,
};

// Ejecuta una herramienta. Nunca lanza: cualquier fallo vuelve a la IA como error.
export async function runTool(scope: IaScope, name: string, input: unknown, draftsSoFar: number): Promise<ToolOutcome> {
  const reader = READERS[name];
  if (reader) {
    const content = await reader(scope).catch(() => null);
    return content === null ? { content: READ_FAILED, isError: true } : { content, isError: false };
  }

  const kind = PROPOSAL_KIND[name];
  if (!kind) return { content: `Herramienta desconocida: ${name}.`, isError: true };
  if (draftsSoFar >= MAX_DRAFTS_PER_SESSION) {
    return { content: `Límite de ${MAX_DRAFTS_PER_SESSION} borradores por dictado alcanzado. Termina aquí.`, isError: true };
  }

  const checked = validateDraft(kind, input);
  if (!checked.ok) return { content: `${checked.error} Corrige o usa preguntar_al_doctor.`, isError: true };

  const { data, error } = await scope.supabase
    .from("ai_drafts")
    .insert({
      session_id: scope.sessionId,
      encounter_id: scope.encounterId,
      patient_id: scope.patientId,
      kind,
      payload: checked.payload,
    })
    .select("id")
    .single();
  if (error) return { content: "No se pudo guardar el borrador. Termina e informa que hubo un error.", isError: true };
  return { content: `Borrador ${data.id} guardado.`, isError: false, draftId: data.id };
}

