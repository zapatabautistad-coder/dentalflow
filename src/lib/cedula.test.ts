import { describe, expect, it } from "vitest";
import { validateCedula } from "./cedula";

describe("validateCedula", () => {
  it("acepta una cédula con dígito verificador correcto", () => {
    expect(validateCedula("12345678903")).toBe(true);
  });

  it("acepta la misma cédula con guiones y espacios", () => {
    expect(validateCedula(" 123-4567890-3 ")).toBe(true);
  });

  it("rechaza un dígito verificador incorrecto", () => {
    expect(validateCedula("12345678904")).toBe(false);
  });

  it("rechaza menos de 11 dígitos", () => {
    expect(validateCedula("1234567890")).toBe(false);
  });

  it("rechaza más de 11 dígitos", () => {
    expect(validateCedula("123456789034")).toBe(false);
  });

  it("rechaza texto sin dígitos suficientes", () => {
    expect(validateCedula("abc")).toBe(false);
  });

  it("rechaza once ceros", () => {
    expect(validateCedula("00000000000")).toBe(false);
  });

  it("rechaza una cadena vacía", () => {
    expect(validateCedula("")).toBe(false);
  });
});
