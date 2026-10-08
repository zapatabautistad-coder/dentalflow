import { describe, expect, it } from "vitest";
import {
  isValidExequatur,
  isValidVoidReason,
  parsePrescription,
  prescriptionDbError,
  type PrescriptionItemInput,
} from "./prescriptions";

const row = (overrides: Partial<PrescriptionItemInput> = {}): PrescriptionItemInput => ({
  medication: "",
  dose: "",
  frequency: "",
  duration: "",
  quantity: "",
  instructions: "",
  ...overrides,
});

describe("parsePrescription", () => {
  it("acepta medicamentos, ignora filas vacías y recorta espacios", () => {
    const result = parsePrescription(
      [row({ medication: "  Amoxicilina 500 mg ", frequency: "cada 8 horas" }), row(), row({ medication: "Ibuprofeno" })],
      "  Tomar con comida. "
    );
    expect(result).toEqual({
      ok: true,
      items: [
        row({ medication: "Amoxicilina 500 mg", frequency: "cada 8 horas" }),
        row({ medication: "Ibuprofeno" }),
      ],
      indications: "Tomar con comida.",
    });
  });

  it("exige al menos un medicamento", () => {
    expect(parsePrescription([row(), row()], "")).toEqual({ ok: false, error: "Agrega al menos un medicamento." });
  });

  it("una fila con datos necesita el medicamento", () => {
    const result = parsePrescription([row({ medication: "Ibuprofeno" }), row({ dose: "1 tableta" })], "");
    expect(result).toEqual({ ok: false, error: "Escribe el medicamento de la línea 2." });
  });

  it("respeta los límites de la base", () => {
    expect(parsePrescription([row({ medication: "x".repeat(201) })], "").ok).toBe(false);
    expect(parsePrescription([row({ medication: "Ibuprofeno", quantity: "9".repeat(51) })], "").ok).toBe(false);
    expect(parsePrescription([row({ medication: "Ibuprofeno" })], "a".repeat(1001)).ok).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => row({ medication: `Medicamento ${i}` }));
    expect(parsePrescription(many, "")).toEqual({ ok: false, error: "Una receta admite hasta 20 medicamentos." });
  });

  it("sin indicaciones guarda null", () => {
    const result = parsePrescription([row({ medication: "Ibuprofeno" })], "   ");
    expect(result.ok && result.indications).toBeNull();
  });
});

describe("validaciones", () => {
  it("exequátur como el check de la base", () => {
    expect(isValidExequatur("12345-06")).toBe(true);
    expect(isValidExequatur("EX/123.4")).toBe(true);
    expect(isValidExequatur("12 34")).toBe(false);
    expect(isValidExequatur("")).toBe(false);
    expect(isValidExequatur("1".repeat(31))).toBe(false);
  });

  it("motivo de anulación de 5 a 500 caracteres", () => {
    expect(isValidVoidReason("  abcd ")).toBe(false);
    expect(isValidVoidReason("Dosis equivocada")).toBe(true);
    expect(isValidVoidReason("x".repeat(501))).toBe(false);
  });

  it("solo muestra mensajes conocidos de la base", () => {
    expect(prescriptionDbError("La cita no es de este paciente.", "Error")).toBe("La cita no es de este paciente.");
    expect(prescriptionDbError('new row violates row-level security policy', "Error")).toBe("Error");
    expect(prescriptionDbError(undefined, "Error")).toBe("Error");
  });
});
