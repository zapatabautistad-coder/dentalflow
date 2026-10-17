"use server";

// Server actions de la IA ambiental (pendientes/18-ia-ambiental.md). Las pantallas (C7) solo
// llaman a estas funciones. Errores como clave conocida (errorKey); textos en language-bridge.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canWriteClinicalEntries,
  canWriteOdontogram,
  canWriteTreatmentPlan,
  requireProfile,
  type Role,
} from "@/lib/auth";
import { canDecideDraft, validateDraft, type DraftKind, type DraftPayload } from "@/lib/ia/drafts";
import { IA_MODEL, runDictation, type DictationStop } from "@/lib/ia/harness";

export type IaErrorKey =
  | "ia.error.notAllowed"
  | "ia.error.notConfigured"
  | "ia.error.transcript"
  | "ia.error.encounterClosed"
  | "ia.error.noConsent"
  | "ia.error.dailyLimit"
  | "ia.error.sessionFailed"
  | "ia.error.draftNotFound"
  | "ia.error.draftDecided"
  | "ia.error.draftInvalid"
  | "ia.error.recordFailed"
  | "ia.error.draftNotLinked"
  | "ia.error.noteLength"
  | "ia.error.consentFailed";

export type DictationResult =
  | { ok: true; stop: DictationStop; draftIds: string[]; summary: string | null }
  | { ok: false; errorKey: IaErrorKey };

export type DecisionResult = { ok: true; recordId: string | null } | { ok: false; errorKey: IaErrorKey; detail?: string };

const MAX_TRANSCRIPT = 8000;
const MAX_DECISION_NOTE = 500;
// Corte por clínica en 24 h. Provisional en la app: el límite definitivo va en la base.
const MAX_SESSIONS_PER_CLINIC_DAY = 200;

function refresh(patientId: string) {
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/odontograma`);
  revalidatePath(`/patients/${patientId}/plan-tratamiento`);
}

// Dictado → borradores. `origin` "voz" exige además el consentimiento de dictado.
export async function dictateToEncounter(
  patientId: string,
  encounterId: string,
  transcript: string,
  origin: "voz" | "texto"
): Promise<DictationResult> {
  const profile = await requireProfile();
  if (!canWriteClinicalEntries(profile.role)) return { ok: false, errorKey: "ia.error.notAllowed" };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, errorKey: "ia.error.notConfigured" };

  const text = String(transcript ?? "").trim();
  if (text.length < 3 || text.length > MAX_TRANSCRIPT) return { ok: false, errorKey: "ia.error.transcript" };

  const supabase = await createClient();

  const { data: encounter } = await supabase
    .from("encounters")
    .select("id, patient_id, status, reason")
    .eq("id", encounterId)
    .maybeSingle();
  if (!encounter || encounter.patient_id !== patientId || encounter.status !== "abierta") {
    return { ok: false, errorKey: "ia.error.encounterClosed" };
  }

  const scopes = origin === "voz" ? (["procesamiento_ia", "dictado"] as const) : (["procesamiento_ia"] as const);
  for (const scope of scopes) {
    const { data: granted, error } = await supabase.rpc("ai_consent_active", { p_patient: patientId, p_scope: scope });
    if (error || granted !== true) return { ok: false, errorKey: "ia.error.noConsent" };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_sessions")
    .select("id", { count: "exact", head: true })
    .gte("started_at", since);
  if (countError || (count ?? 0) >= MAX_SESSIONS_PER_CLINIC_DAY) return { ok: false, errorKey: "ia.error.dailyLimit" };

  // Autor, hora, consumo inicial y consentimiento los fija y revisa la base (stamp_ai_session).
  const { data: session, error: sessionError } = await supabase
    .from("ai_sessions")
    .insert({ encounter_id: encounterId, patient_id: patientId, model: IA_MODEL })
    .select("id")
    .single();
  if (sessionError || !session) return { ok: false, errorKey: "ia.error.sessionFailed" };

  const run = await runDictation({ supabase, patientId, encounterId, sessionId: session.id }, encounter.reason, text);
  if (run.draftIds.length > 0) refresh(patientId);
  if (run.stop === "error" && run.draftIds.length === 0) return { ok: false, errorKey: "ia.error.sessionFailed" };
  return { ok: true, stop: run.stop, draftIds: run.draftIds, summary: run.summary };
}

function canWriteKind(role: Role, kind: DraftKind): boolean {
  if (kind === "odontograma") return canWriteOdontogram(role);
  if (kind === "plan") return canWriteTreatmentPlan(role);
  if (kind === "pregunta") return true;
  return canWriteClinicalEntries(role);
}

async function insertRecord<K extends Exclude<DraftKind, "pregunta">>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: K,
  payload: DraftPayload[K],
  patientId: string,
  encounterId: string
): Promise<string | null> {
  const link = { patient_id: patientId, encounter_id: encounterId, source: "ia_confirmada" as const };
  let result;
  if (kind === "odontograma") {
    const p = payload as DraftPayload["odontograma"];
    result = await supabase
      .from("odontogram_entries")
      .insert({ ...link, tooth: p.tooth, surfaces: p.surfaces, condition: p.condition, note: p.note })
      .select("id")
      .single();
  } else if (kind === "nota") {
    const p = payload as DraftPayload["nota"];
    result = await supabase.from("clinical_entries").insert({ ...link, kind: "nota", body: p.body }).select("id").single();
  } else if (kind === "signos") {
    const p = payload as DraftPayload["signos"];
    result = await supabase.from("vital_signs").insert({ ...link, ...p }).select("id").single();
  } else {
    // El plan no lleva consulta ni origen (019); la 036 enlaza el borrador por paciente.
    const p = payload as DraftPayload["plan"];
    result = await supabase
      .from("treatment_plan_items")
      .insert({ patient_id: patientId, procedure: p.procedure, tooth: p.tooth, surfaces: p.surfaces, note: p.note })
      .select("id")
      .single();
  }
  return result.error || !result.data ? null : result.data.id;
}

// Firma: el doctor acepta el borrador tal cual o con sus cambios (`edited`, se valida igual).
// Se guarda con el flujo normal en la tabla clínica y el borrador queda enlazado.
export async function acceptDraft(patientId: string, draftId: string, edited?: unknown): Promise<DecisionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("ai_drafts")
    .select("id, kind, payload, status, encounter_id, patient_id")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || draft.patient_id !== patientId) return { ok: false, errorKey: "ia.error.draftNotFound" };
  if (draft.status !== "propuesto") return { ok: false, errorKey: "ia.error.draftDecided" };
  if (!canDecideDraft(profile.role, draft.kind) || !canWriteKind(profile.role, draft.kind)) {
    return { ok: false, errorKey: "ia.error.notAllowed" };
  }

  let recordId: string | null = null;
  if (draft.kind !== "pregunta") {
    const checked = validateDraft(draft.kind, edited ?? draft.payload);
    if (!checked.ok) return { ok: false, errorKey: "ia.error.draftInvalid", detail: checked.error };
    recordId = await insertRecord(supabase, draft.kind, checked.payload, patientId, draft.encounter_id);
    if (!recordId) return { ok: false, errorKey: "ia.error.recordFailed" };
  }

  // Si esto falla, el registro ya existe: la pantalla debe recargar y no ofrecer aceptar de nuevo.
  const { error } = await supabase
    .from("ai_drafts")
    .update({ status: "aceptado", accepted_record_id: recordId, decision_note: edited === undefined ? null : "Editado por el doctor" })
    .eq("id", draftId);
  refresh(patientId);
  if (error) return { ok: false, errorKey: "ia.error.draftNotLinked" };
  return { ok: true, recordId };
}

export async function rejectDraft(patientId: string, draftId: string, note: string | null): Promise<DecisionResult> {
  const profile = await requireProfile();
  const reason = String(note ?? "").trim();
  if (reason.length > MAX_DECISION_NOTE) return { ok: false, errorKey: "ia.error.noteLength" };

  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("ai_drafts")
    .select("id, kind, status, patient_id")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || draft.patient_id !== patientId) return { ok: false, errorKey: "ia.error.draftNotFound" };
  if (draft.status !== "propuesto") return { ok: false, errorKey: "ia.error.draftDecided" };
  if (!canDecideDraft(profile.role, draft.kind)) return { ok: false, errorKey: "ia.error.notAllowed" };

  const { error } = await supabase
    .from("ai_drafts")
    .update({ status: "rechazado", decision_note: reason || null })
    .eq("id", draftId);
  if (error) return { ok: false, errorKey: "ia.error.draftDecided" };
  refresh(patientId);
  return { ok: true, recordId: null };
}

// Consentimiento: otorgar o revocar es siempre una fila nueva (autor y hora por la base).
export async function recordAiConsent(
  patientId: string,
  scope: "dictado" | "procesamiento_ia",
  granted: boolean,
  note: string | null
): Promise<{ ok: true } | { ok: false; errorKey: IaErrorKey }> {
  const profile = await requireProfile();
  if (!["admin", "recepcion", "doctor", "enfermeria"].includes(profile.role)) {
    return { ok: false, errorKey: "ia.error.notAllowed" };
  }
  if (scope !== "dictado" && scope !== "procesamiento_ia") return { ok: false, errorKey: "ia.error.consentFailed" };
  const text = String(note ?? "").trim();
  if (text.length > MAX_DECISION_NOTE) return { ok: false, errorKey: "ia.error.noteLength" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_consents")
    .insert({ patient_id: patientId, scope, granted: granted === true, note: text || null });
  if (error) return { ok: false, errorKey: "ia.error.consentFailed" };
  revalidatePath(`/patients/${patientId}`);
  return { ok: true };
}
