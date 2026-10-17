import { describe, expect, it } from "vitest";
import { addUsage, EMPTY_USAGE, estimateCostUsd } from "./cost";

describe("estimateCostUsd", () => {
  it("calcula Opus 5.5 con caché", () => {
    const usage = { input_tokens: 2_000, output_tokens: 2_000, cache_read_tokens: 13_000, cache_write_tokens: 0 };
    // 2000×4 + 2000×20 + 13000×0.2 = 50600 → 0.0506
    expect(estimateCostUsd("claude-opus-5-5", usage)).toBe(0.0506);
  });

  it("modelo desconocido: precio alto y redondeo hacia arriba", () => {
    expect(estimateCostUsd("otro", { input_tokens: 1, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 })).toBe(0.0001);
  });

  it("suma consumos", () => {
    const one = { input_tokens: 1, output_tokens: 2, cache_read_tokens: 3, cache_write_tokens: 4 };
    expect(addUsage(addUsage(EMPTY_USAGE, one), one)).toEqual({ input_tokens: 2, output_tokens: 4, cache_read_tokens: 6, cache_write_tokens: 8 });
  });
});
