// Costo estimado de una sesión de IA (US$ por millón de tokens, precios públicos de Anthropic
// al 2026-10). Solo para medir y para el límite por clínica; la factura real es la de Anthropic.

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
};

type Price = { input: number; output: number; cacheRead: number };

const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

// Modelo desconocido (p. ej. un respaldo nuevo): se cobra al precio más alto de la tabla,
// para no subestimar el consumo.
const FALLBACK_PRICE: Price = { input: 5, output: 25, cacheRead: 0.5 };

// Escritura en caché de 5 minutos = 1.25 × entrada.
const CACHE_WRITE_FACTOR = 1.25;

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const price = PRICES[model] ?? FALLBACK_PRICE;
  const cost =
    (usage.input_tokens * price.input +
      usage.output_tokens * price.output +
      usage.cache_read_tokens * price.cacheRead +
      usage.cache_write_tokens * price.input * CACHE_WRITE_FACTOR) /
    1_000_000;
  // numeric(10,4) en ai_sessions; se redondea hacia arriba.
  return Math.ceil(cost * 10_000) / 10_000;
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_tokens: a.cache_read_tokens + b.cache_read_tokens,
    cache_write_tokens: a.cache_write_tokens + b.cache_write_tokens,
  };
}

export const EMPTY_USAGE: TokenUsage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
