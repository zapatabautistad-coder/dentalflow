import { describe, expect, it } from "vitest";
import { canDecideDraft, validateDraft } from "./drafts";

describe("validateDraft · odontograma", () => {
  it("acepta un hallazgo válido", () => {
    expect(validateDraft("odontograma", { tooth: 16, surfaces: ["O", "M"], condition: "caries", note: null })).toEqual({
      ok: true,
      payload: { tooth: 16, surfaces: ["O", "M"], condition: "caries", note: null },
    });
  });

  it("rechaza dientes inventados y superficies faltantes", () => {
    expect(validateDraft("odontograma", { tooth: 19, surfaces: null, condition: "corona", note: null }).ok).toBe(false);
    expect(validateDraft("odontograma", { tooth: 16, surfaces: null, condition: "caries", note: null }).ok).toBe(false);
    expect(validateDraft("odontograma", { tooth: 16, surfaces: null, condition: "inventada", note: null }).ok).toBe(false);
  });

  it("quita superficies de condiciones de diente completo", () => {
    const result = validateDraft("odontograma", { tooth: 36, surfaces: ["O"], condition: "endodoncia", note: null });
    expect(result).toEqual({ ok: true, payload: { tooth: 36, surfaces: null, condition: "endodoncia", note: null } });
  });
});

describe("validateDraft · nota, signos, plan y pregunta", () => {
  it("nota: no vacía y con límite", () => {
    expect(validateDraft("nota", { body: "  Dolor en 46.  " })).toEqual({ ok: true, payload: { body: "Dolor en 46." } });
    expect(validateDraft("nota", { body: "   " }).ok).toBe(false);
    expect(validateDraft("nota", { body: "x".repeat(4001) }).ok).toBe(false);
  });

  it("signos: mismos rangos que la pantalla", () => {
    const base = { systolic: 120, diastolic: 80, heart_rate: 72, glucose_mg_dl: null, oxygen_saturation: 98, note: null };
    expect(validateDraft("signos", base)).toEqual({ ok: true, payload: base });
    expect(validateDraft("signos", { ...base, diastolic: null }).ok).toBe(false);
    expect(validateDraft("signos", { ...base, heart_rate: 300 }).ok).toBe(false);
    expect(validateDraft("signos", { ...base, heart_rate: "72" }).ok).toBe(false);
    expect(
      validateDraft("signos", { systolic: null, diastolic: null, heart_rate: null, glucose_mg_dl: null, oxygen_saturation: null, note: null }).ok
    ).toBe(false);
  });

  it("plan: superficies solo con diente", () => {
    expect(validateDraft("plan", { procedure: "Resina compuesta", tooth: 26, surfaces: ["O", "O"], note: null })).toEqual({
      ok: true,
      payload: { procedure: "Resina compuesta", tooth: 26, surfaces: ["O"], note: null },
    });
    expect(validateDraft("plan", { procedure: "Resina", tooth: null, surfaces: ["O"], note: null }).ok).toBe(false);
    expect(validateDraft("plan", { procedure: "R", tooth: null, surfaces: null, note: null }).ok).toBe(false);
    expect(validateDraft("plan", { procedure: "Profilaxis", tooth: 99, surfaces: null, note: null }).ok).toBe(false);
  });

  it("pregunta: no vacía", () => {
    expect(validateDraft("pregunta", { question: "¿Qué diente?" }).ok).toBe(true);
    expect(validateDraft("pregunta", { question: "" }).ok).toBe(false);
    expect(validateDraft("pregunta", null).ok).toBe(false);
  });
});

describe("canDecideDraft", () => {
  it("el doctor firma todo; el asistente dental solo signos", () => {
    expect(canDecideDraft("doctor", "odontograma")).toBe(true);
    expect(canDecideDraft("enfermeria", "signos")).toBe(true);
    expect(canDecideDraft("enfermeria", "nota")).toBe(false);
    expect(canDecideDraft("recepcion", "signos")).toBe(false);
    expect(canDecideDraft("admin", "pregunta")).toBe(false);
  });
});
