import { describe, expect, it } from "vitest";
import { aiConsentStatus, hasAiConsent, parseAiConsentInput, type AiConsentEntry } from "./ai-consent";

function entry(id: string, scope: AiConsentEntry["scope"], granted: boolean, created_at: string): AiConsentEntry {
  return { id, scope, granted, created_at };
}

describe("aiConsentStatus", () => {
  it("sin entradas no hay registro", () => {
    expect(aiConsentStatus([], "dictado")).toBe("sin_registro");
    expect(hasAiConsent([], "dictado")).toBe(false);
  });

  it("la entrada más reciente manda (retiro después de aceptar)", () => {
    const entries = [
      entry("a", "dictado", true, "2026-10-01T10:00:00Z"),
      entry("b", "dictado", false, "2026-10-05T10:00:00Z"),
    ];
    expect(aiConsentStatus(entries, "dictado")).toBe("rechazado");
    expect(hasAiConsent(entries, "dictado")).toBe(false);
  });

  it("no depende del orden en que llegan las entradas", () => {
    const entries = [
      entry("b", "dictado", true, "2026-10-05T10:00:00Z"),
      entry("a", "dictado", false, "2026-10-01T10:00:00Z"),
    ];
    expect(aiConsentStatus(entries, "dictado")).toBe("aceptado");
  });

  it("cada alcance es independiente", () => {
    const entries = [entry("a", "dictado", true, "2026-10-01T10:00:00Z")];
    expect(hasAiConsent(entries, "dictado")).toBe(true);
    expect(aiConsentStatus(entries, "ambiental")).toBe("sin_registro");
    expect(hasAiConsent(entries, "ambiental")).toBe(false);
  });
});

describe("parseAiConsentInput", () => {
  it("acepta una decisión válida y limpia la nota", () => {
    expect(parseAiConsentInput({ scope: "dictado", granted: "true", note: "  firmó en papel " })).toEqual({
      ok: true,
      values: { scope: "dictado", granted: true, note: "firmó en papel" },
    });
    expect(parseAiConsentInput({ scope: "ambiental", granted: "false", note: "" })).toEqual({
      ok: true,
      values: { scope: "ambiental", granted: false, note: null },
    });
  });

  it("rechaza alcance, decisión o nota inválidos", () => {
    expect(parseAiConsentInput({ scope: "otro", granted: "true", note: "" })).toEqual({ ok: false, errorKey: "aiConsent.error.scope" });
    expect(parseAiConsentInput({ scope: "dictado", granted: "si", note: "" })).toEqual({ ok: false, errorKey: "aiConsent.error.decision" });
    expect(parseAiConsentInput({ scope: "dictado", granted: "true", note: "x".repeat(501) })).toEqual({
      ok: false,
      errorKey: "aiConsent.error.noteLong",
    });
  });
});
