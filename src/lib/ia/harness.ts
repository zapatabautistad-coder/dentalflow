// Harness de la IA ambiental (pendientes/18-ia-ambiental.md): un dictado → una sesión de IA →
// borradores en ai_drafts. Bucle manual de herramientas para controlar cada paso:
// límite de turnos, stop_reason antes de ejecutar, consumo registrado tras cada respuesta.
// Solo servidor: la clave de la API nunca llega al navegador.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { addUsage, EMPTY_USAGE, estimateCostUsd, type TokenUsage } from "./cost";
import { MAPA_DOMINIO } from "./mapa.generated";
import {
  readOdontogram,
  readPatient,
  readPlan,
  readVitalSigns,
  runTool,
  TOOL_DEFINITIONS,
  type IaScope,
} from "./tools";

export const IA_MODEL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MAX_TURNS = 8;
const MAX_TOKENS = 16000;
const SHORT_DICTATION = 400;

export type DictationStop = "end_turn" | "refusal" | "max_tokens" | "turn_limit" | "error";

export type DictationRun = {
  stop: DictationStop;
  draftIds: string[];
  summary: string | null;
  usage: TokenUsage;
  costUsd: number;
};

function usageOf(message: Anthropic.Beta.BetaMessage): TokenUsage {
  return {
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: message.usage.cache_creation_input_tokens ?? 0,
  };
}

// El contexto del paciente va después del prefijo fijo (herramientas + mapa), así el prefijo
// se reutiliza entre pacientes. El dictado se marca como datos, no instrucciones.
async function firstMessage(scope: IaScope, reason: string | null, transcript: string): Promise<string> {
  const [patient, odontogram, plan, vitals] = await Promise.all([
    readPatient(scope),
    readOdontogram(scope),
    readPlan(scope),
    readVitalSigns(scope),
  ]);
  const block = (tag: string, value: string | null) => `<${tag}>\n${value ?? "no disponible"}\n</${tag}>`;
  return [
    block("motivo_de_la_consulta", reason ? JSON.stringify(reason) : null),
    block("paciente", patient),
    block("odontograma_actual", odontogram),
    block("plan_de_tratamiento", plan),
    block("signos_vitales_recientes", vitals),
    block("dictado", JSON.stringify(transcript)),
    "Convierte el dictado en borradores con las herramientas de propuesta.",
  ].join("\n\n");
}

async function recordUsage(scope: IaScope, usage: TokenUsage, costUsd: number, end: boolean) {
  // El trigger de la 036 solo deja subir el consumo y pone la hora de fin.
  await scope.supabase
    .from("ai_sessions")
    .update({ ...usage, cost_usd: costUsd, ...(end ? { ended_at: new Date().toISOString() } : {}) })
    .eq("id", scope.sessionId);
}

function isToolJsonError(error: unknown): boolean {
  return error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError);
}

export async function runDictation(scope: IaScope, reason: string | null, transcript: string): Promise<DictationRun> {
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  const effort = transcript.length <= SHORT_DICTATION ? "low" : "medium";
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: await firstMessage(scope, reason, transcript) },
  ];

  let usage = EMPTY_USAGE;
  let costUsd = 0;
  let stop: DictationStop = "turn_limit";
  let summary: string | null = null;
  const draftIds: string[] = [];

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      let message: Anthropic.Beta.BetaMessage | null = null;
      // Entrada de herramienta ilegible (streaming sin búfer): se repite la petición una vez.
      for (let attempt = 0; attempt < 2 && !message; attempt++) {
        try {
          message = await client.beta.messages
            .stream({
              model: IA_MODEL,
              max_tokens: MAX_TOKENS,
              betas: [FALLBACK_BETA],
              fallbacks: "default",
              thinking: { type: "adaptive" },
              output_config: { effort },
              system: [{ type: "text", text: MAPA_DOMINIO, cache_control: { type: "ephemeral" } }],
              tools: TOOL_DEFINITIONS,
              tool_choice: { type: "auto" },
              messages,
            })
            .finalMessage();
        } catch (error) {
          if (!isToolJsonError(error) || attempt === 1) throw error;
        }
      }
      if (!message) throw new Error("Sin respuesta de la IA.");

      const turnUsage = usageOf(message);
      usage = addUsage(usage, turnUsage);
      costUsd += estimateCostUsd(message.model, turnUsage);
      await recordUsage(scope, usage, costUsd, false);

      // Nunca se ejecutan herramientas de una respuesta rechazada o cortada.
      if (message.stop_reason === "refusal") {
        stop = "refusal";
        break;
      }
      if (message.stop_reason === "max_tokens") {
        stop = "max_tokens";
        break;
      }

      messages.push({ role: "assistant", content: message.content });

      if (message.stop_reason === "pause_turn") continue;
      if (message.stop_reason !== "tool_use") {
        stop = "end_turn";
        summary =
          message.content
            .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .trim()
            .slice(0, 1000) || null;
        break;
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        const outcome = await runTool(scope, block.name, block.input, draftIds.length);
        if (outcome.draftId) draftIds.push(outcome.draftId);
        results.push({ type: "tool_result", tool_use_id: block.id, content: outcome.content, is_error: outcome.isError || undefined });
      }
      messages.push({ role: "user", content: results });
    }
  } catch (error) {
    stop = "error";
    console.error("IA: fallo en el dictado", error instanceof Anthropic.APIError ? `${error.status} ${error.name}` : error instanceof Error ? error.name : "desconocido");
  } finally {
    await recordUsage(scope, usage, costUsd, true);
  }

  return { stop, draftIds, summary, usage, costUsd };
}
