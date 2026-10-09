import { describe, expect, it } from "vitest";
import { validateDictation } from "./dictation";

describe("validateDictation", () => {
  it("acepta hallazgos válidos (permanentes y temporales)", () => {
    const r = validateDictation({
      findings: [
        { tooth: 36, surfaces: ["O", "D"], condition: "caries", note: "profunda" },
        { tooth: 85, surfaces: null, condition: "ausente" },
      ],
    });
    expect(r).toEqual({
      ok: true,
      proposal: {
        findings: [
          { tooth: 36, surfaces: ["O", "D"], condition: "caries", note: "profunda" },
          { tooth: 85, surfaces: null, condition: "ausente", note: null },
        ],
        questions: [],
      },
    });
  });

  it("pregunta la superficie cuando falta en caries u obturación (no adivina)", () => {
    const r = validateDictation({ findings: [{ tooth: 16, condition: "obturacion" }] });
    expect(r.ok && r.proposal.findings).toEqual([]);
    expect(r.ok && r.proposal.questions[0]).toMatch(/superficie/);
  });

  it("rechaza dientes fuera de FDI y condiciones inventadas", () => {
    const r = validateDictation({
      findings: [
        { tooth: 19, condition: "corona" },
        { tooth: 21, condition: "blanqueamiento" },
      ],
    });
    expect(r.ok && r.proposal.findings).toEqual([]);
    expect(r.ok && r.proposal.questions).toHaveLength(2);
  });

  it("rechaza superficies desconocidas y quita superficies en condiciones de diente completo", () => {
    expect(validateDictation({ findings: [{ tooth: 11, surfaces: ["X"], condition: "caries" }] })).toMatchObject({
      ok: true,
      proposal: { findings: [] },
    });
    const r = validateDictation({ findings: [{ tooth: 11, surfaces: ["V"], condition: "corona" }] });
    expect(r.ok && r.proposal.findings[0].surfaces).toBeNull();
  });

  it("falla con respuestas que no son una propuesta", () => {
    expect(validateDictation(null).ok).toBe(false);
    expect(validateDictation({ findings: "x" }).ok).toBe(false);
    expect(validateDictation({ findings: [] }).ok).toBe(false);
  });
});
