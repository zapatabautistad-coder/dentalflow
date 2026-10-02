import { describe, expect, it } from "vitest";
import { canMoveTreatment, parseCost, treatmentTotals } from "./treatment-plan";

describe("canMoveTreatment", () => {
  it("permite avanzar y cancelar mientras no esté terminado", () => {
    expect(canMoveTreatment("pendiente", "en_proceso")).toBe(true);
    expect(canMoveTreatment("pendiente", "completado")).toBe(true);
    expect(canMoveTreatment("en_proceso", "cancelado")).toBe(true);
  });

  it("no permite retroceder ni cambiar algo terminado", () => {
    expect(canMoveTreatment("en_proceso", "pendiente")).toBe(false);
    expect(canMoveTreatment("completado", "cancelado")).toBe(false);
    expect(canMoveTreatment("cancelado", "pendiente")).toBe(false);
  });
});

describe("treatmentTotals", () => {
  it("separa pendiente y realizado, sin contar lo cancelado", () => {
    expect(
      treatmentTotals([
        { status: "pendiente", estimated_cost: 1500 },
        { status: "en_proceso", estimated_cost: "2500.50" },
        { status: "completado", estimated_cost: 3000 },
        { status: "cancelado", estimated_cost: 9000 },
        { status: "pendiente", estimated_cost: null },
      ])
    ).toEqual({ pending: 4000.5, done: 3000, total: 7000.5 });
  });
});

describe("parseCost", () => {
  it("entiende montos con comas y RD$", () => {
    expect(parseCost("1,500.50")).toBe(1500.5);
    expect(parseCost("RD$ 2,000")).toBe(2000);
    expect(parseCost("")).toBeNull();
  });

  it("rechaza montos inválidos", () => {
    expect(parseCost("abc")).toBeNaN();
    expect(parseCost("-5")).toBeNaN();
    expect(parseCost("10.999")).toBeNaN();
  });
});
