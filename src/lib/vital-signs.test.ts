import { describe, expect, it } from "vitest";
import {
  classifyBloodPressure,
  currentVitalSigns,
  vitalAlerts,
  vitalSignsReasons,
  type VitalSignsEntry,
} from "./vital-signs";

const empty = { systolic: null, diastolic: null, heart_rate: null, glucose_mg_dl: null, oxygen_saturation: null };

describe("classifyBloodPressure", () => {
  it("usa las categorías AHA/ACC 2017", () => {
    expect(classifyBloodPressure(115, 75)).toBe("normal");
    expect(classifyBloodPressure(125, 78)).toBe("elevada");
    expect(classifyBloodPressure(132, 70)).toBe("hta1");
    expect(classifyBloodPressure(118, 85)).toBe("hta1");
    expect(classifyBloodPressure(145, 85)).toBe("hta2");
    expect(classifyBloodPressure(130, 92)).toBe("hta2");
    expect(classifyBloodPressure(182, 100)).toBe("crisis");
    expect(classifyBloodPressure(150, 121)).toBe("crisis");
  });

  it("la categoría más alta de las dos cifras manda", () => {
    expect(classifyBloodPressure(125, 85)).toBe("hta1");
  });
});

describe("vitalAlerts", () => {
  it("no alerta con valores normales", () => {
    expect(vitalAlerts({ systolic: 118, diastolic: 76, heart_rate: 72, glucose_mg_dl: 95, oxygen_saturation: 98 })).toEqual([]);
  });

  it("alerta hipertensión etapa 2 y crisis, no etapa 1", () => {
    expect(vitalAlerts({ ...empty, systolic: 135, diastolic: 85 })).toEqual([]);
    expect(vitalAlerts({ ...empty, systolic: 150, diastolic: 95 })[0].message).toBe("Hipertensión etapa 2");
    expect(vitalAlerts({ ...empty, systolic: 190, diastolic: 110 })[0].message).toBe("Crisis hipertensiva");
  });

  it("alerta pulso, glucemia y saturación fuera de rango", () => {
    const fields = vitalAlerts({ ...empty, heart_rate: 110, glucose_mg_dl: 60, oxygen_saturation: 88 }).map((a) => a.field);
    expect(fields).toEqual(["heart_rate", "glucose_mg_dl", "oxygen_saturation"]);
    expect(vitalAlerts({ ...empty, heart_rate: 50 })[0].message).toContain("Bradicardia");
  });
});

describe("vitalSignsReasons", () => {
  it("lista los antecedentes de riesgo", () => {
    expect(vitalSignsReasons({ has_hypertension: true, has_diabetes: true, has_heart_disease: false })).toEqual([
      "hipertensión",
      "diabetes",
    ]);
  });

  it("sin antecedentes o sin historia no pide nada", () => {
    expect(vitalSignsReasons({ has_hypertension: false })).toEqual([]);
    expect(vitalSignsReasons(null)).toEqual([]);
  });
});

describe("currentVitalSigns", () => {
  const entry = (id: string, created_at: string, corrects: string | null = null): VitalSignsEntry => ({
    id,
    ...empty,
    systolic: 120,
    diastolic: 80,
    corrects_entry_id: corrects,
    created_at,
  });

  it("oculta las tomas corregidas y ordena de la más reciente a la más antigua", () => {
    const result = currentVitalSigns([
      entry("a", "2026-10-04T10:00:00Z"),
      entry("b", "2026-10-04T11:00:00Z"),
      entry("c", "2026-10-04T11:05:00Z", "b"),
    ]);
    expect(result.map((e) => e.id)).toEqual(["c", "a"]);
  });
});
