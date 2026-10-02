import { describe, expect, it } from "vitest";
import { activeEntries, computeOdontogram, isValidTooth, type OdontogramEntry } from "./odontogram";

let n = 0;
function entry(partial: Partial<OdontogramEntry>): OdontogramEntry {
  n += 1;
  return {
    id: partial.id ?? `e${n}`,
    tooth: 36,
    surfaces: null,
    condition: null,
    note: null,
    corrects_entry_id: null,
    correction_reason: null,
    created_at: `2026-01-01T10:${String(n).padStart(2, "0")}:00Z`,
    ...partial,
  };
}

describe("isValidTooth", () => {
  it("acepta permanentes y temporales FDI", () => {
    expect(isValidTooth(11)).toBe(true);
    expect(isValidTooth(48)).toBe(true);
    expect(isValidTooth(55)).toBe(true);
    expect(isValidTooth(85)).toBe(true);
  });

  it("rechaza números que no existen", () => {
    expect(isValidTooth(19)).toBe(false);
    expect(isValidTooth(56)).toBe(false);
    expect(isValidTooth(90)).toBe(false);
    expect(isValidTooth(10)).toBe(false);
  });
});

describe("computeOdontogram", () => {
  it("en cada superficie vale el último hallazgo", () => {
    const state = computeOdontogram([
      entry({ condition: "caries", surfaces: ["O", "M"] }),
      entry({ condition: "obturacion", surfaces: ["O"] }),
    ]);
    expect(state.get(36)?.surfaces).toEqual({ O: "obturacion", M: "caries" });
  });

  it("sano reinicia el diente", () => {
    const state = computeOdontogram([
      entry({ condition: "caries", surfaces: ["O"] }),
      entry({ condition: "endodoncia" }),
      entry({ condition: "sano" }),
    ]);
    expect(state.get(36)).toEqual({ surfaces: {}, whole: [] });
  });

  it("ausente reemplaza todo, incluida la extracción indicada", () => {
    const state = computeOdontogram([
      entry({ condition: "caries", surfaces: ["O"] }),
      entry({ condition: "extraccion_indicada" }),
      entry({ condition: "ausente" }),
    ]);
    expect(state.get(36)).toEqual({ surfaces: {}, whole: ["ausente"] });
  });

  it("corona limpia superficies y se suma a la endodoncia", () => {
    const state = computeOdontogram([
      entry({ condition: "caries", surfaces: ["O"] }),
      entry({ condition: "endodoncia" }),
      entry({ condition: "corona" }),
    ]);
    expect(state.get(36)).toEqual({ surfaces: {}, whole: ["endodoncia", "corona"] });
  });

  it("una entrada anulada no cuenta y la corrección sí", () => {
    const wrong = entry({ id: "mal", tooth: 36, condition: "caries", surfaces: ["O"] });
    const fix = entry({ tooth: 46, condition: "caries", surfaces: ["O"], corrects_entry_id: "mal", correction_reason: "Era el 46" });
    const state = computeOdontogram([wrong, fix]);
    expect(state.has(36)).toBe(false);
    expect(state.get(46)?.surfaces).toEqual({ O: "caries" });
  });

  it("una anulación sin reemplazo no agrega hallazgos", () => {
    const wrong = entry({ id: "x", condition: "fractura" });
    const voided = entry({ corrects_entry_id: "x", correction_reason: "Paciente equivocado" });
    expect(activeEntries([wrong, voided])).toEqual([]);
  });
});
