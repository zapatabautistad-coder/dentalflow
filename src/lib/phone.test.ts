import { describe, expect, it } from "vitest";
import {
  cleanDocumentIdDigits,
  cleanPhoneDigits,
  formatDominicanDocumentId,
  formatDominicanPhone,
} from "./phone";

describe("cleanPhoneDigits", () => {
  it("conserva los dígitos de un teléfono con formato", () => {
    expect(cleanPhoneDigits("809-555-0123")).toBe("8095550123");
  });

  it("elimina espacios, letras y símbolos", () => {
    expect(cleanPhoneDigits(" +1 (809) ABC-555.0123 ")).toBe("1809555012");
  });

  it("devuelve vacío para null, undefined y una cadena vacía", () => {
    expect(cleanPhoneDigits(null)).toBe("");
    expect(cleanPhoneDigits(undefined)).toBe("");
    expect(cleanPhoneDigits("")).toBe("");
  });

  it("recorta entradas de más de diez dígitos", () => {
    expect(cleanPhoneDigits("8095550123456")).toBe("8095550123");
  });
});

describe("formatDominicanPhone", () => {
  it("formatea progresivamente los grupos del teléfono", () => {
    expect(formatDominicanPhone("809")).toBe("809");
    expect(formatDominicanPhone("809555")).toBe("809-555");
    expect(formatDominicanPhone("8095550123")).toBe("809-555-0123");
  });

  it("acepta formatos de entrada y conserva solo diez dígitos", () => {
    expect(formatDominicanPhone(" (809) 555-012345 ")).toBe("809-555-0123");
  });

  it("devuelve vacío para valores ausentes o sin dígitos", () => {
    expect(formatDominicanPhone(null)).toBe("");
    expect(formatDominicanPhone(undefined)).toBe("");
    expect(formatDominicanPhone("abc")).toBe("");
  });
});

describe("cleanDocumentIdDigits", () => {
  it("elimina el formato de una cédula de prueba", () => {
    expect(cleanDocumentIdDigits("001-1234567-8")).toBe("00112345678");
  });

  it("devuelve vacío para null, undefined y una cadena vacía", () => {
    expect(cleanDocumentIdDigits(null)).toBe("");
    expect(cleanDocumentIdDigits(undefined)).toBe("");
    expect(cleanDocumentIdDigits("")).toBe("");
  });

  it("recorta entradas de más de once dígitos", () => {
    expect(cleanDocumentIdDigits("001123456789999")).toBe("00112345678");
  });
});

describe("formatDominicanDocumentId", () => {
  it("formatea progresivamente los grupos de la cédula", () => {
    expect(formatDominicanDocumentId("001")).toBe("001");
    expect(formatDominicanDocumentId("0011234567")).toBe("001-1234567");
    expect(formatDominicanDocumentId("00112345678")).toBe("001-1234567-8");
  });

  it("acepta espacios y símbolos y limita la entrada", () => {
    expect(formatDominicanDocumentId(" 001-1234567-8999 ")).toBe("001-1234567-8");
  });

  it("devuelve vacío para valores ausentes o sin dígitos", () => {
    expect(formatDominicanDocumentId(null)).toBe("");
    expect(formatDominicanDocumentId(undefined)).toBe("");
    expect(formatDominicanDocumentId("sin cédula")).toBe("");
  });
});
