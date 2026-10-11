// Consentimiento del paciente para IA (ONYX), migración 031. El consentimiento
// no se edita: se retira con otra entrada y vale la última de cada alcance.
// El texto que se le lee al paciente está aquí, por versión. Una versión ya
// publicada NUNCA se cambia: si el texto cambia, se agrega "v2" (y se agrega
// también al check de consent_version en la base).

export type AiConsentScope = "dictado" | "ambiental";
export type AiConsentVersion = "v1";

export const AI_CONSENT_SCOPES: AiConsentScope[] = ["dictado", "ambiental"];
export const CURRENT_AI_CONSENT_VERSION: AiConsentVersion = "v1";
export const MAX_AI_CONSENT_NOTE = 500;

export const AI_CONSENT_SCOPE_LABELS: Record<AiConsentScope, string> = {
  dictado: "Dictado del doctor",
  ambiental: "Grabación de la consulta",
};

export const AI_CONSENT_TEXT: Record<AiConsentVersion, Record<AiConsentScope, string>> = {
  v1: {
    dictado:
      "Autorizo que, durante mi atención, la voz del doctor al dictar notas sobre mi caso se envíe a OpenAI (Whisper, para convertirla en texto) y a Anthropic (Claude, para ordenar la nota). El audio no se guarda. Lo que proponga la IA lo revisa y lo firma el doctor; la IA no decide nada sobre mi tratamiento. Puedo retirar este permiso cuando quiera, sin que afecte mi atención.",
    ambiental:
      "Autorizo que se grabe la conversación de mi consulta para que OpenAI (Whisper) la convierta en texto y Anthropic (Claude) prepare un resumen. El audio no se guarda. El resumen lo revisa y lo firma el doctor; la IA no decide nada sobre mi tratamiento. Puedo retirar este permiso cuando quiera, sin que afecte mi atención.",
  },
};

export type AiConsentEntry = {
  id: string;
  scope: AiConsentScope;
  granted: boolean;
  created_at: string;
};

export type AiConsentStatus = "aceptado" | "rechazado" | "sin_registro";

// Estado vigente de un alcance: la entrada más reciente manda.
export function aiConsentStatus(entries: AiConsentEntry[], scope: AiConsentScope): AiConsentStatus {
  let latest: AiConsentEntry | null = null;
  for (const entry of entries) {
    if (entry.scope !== scope) continue;
    if (
      !latest ||
      entry.created_at > latest.created_at ||
      (entry.created_at === latest.created_at && entry.id > latest.id)
    ) {
      latest = entry;
    }
  }
  if (!latest) return "sin_registro";
  return latest.granted ? "aceptado" : "rechazado";
}

// Solo con consentimiento vigente se puede usar la IA con el paciente.
export function hasAiConsent(entries: AiConsentEntry[], scope: AiConsentScope): boolean {
  return aiConsentStatus(entries, scope) === "aceptado";
}

export type AiConsentInput =
  | { ok: true; values: { scope: AiConsentScope; granted: boolean; note: string | null } }
  | { ok: false; errorKey: string };

export function parseAiConsentInput(input: { scope: string; granted: string; note: string }): AiConsentInput {
  if (!(AI_CONSENT_SCOPES as string[]).includes(input.scope)) {
    return { ok: false, errorKey: "aiConsent.error.scope" };
  }
  if (input.granted !== "true" && input.granted !== "false") {
    return { ok: false, errorKey: "aiConsent.error.decision" };
  }
  const note = input.note.trim();
  if (note.length > MAX_AI_CONSENT_NOTE) {
    return { ok: false, errorKey: "aiConsent.error.noteLong" };
  }
  return {
    ok: true,
    values: { scope: input.scope as AiConsentScope, granted: input.granted === "true", note: note || null },
  };
}
