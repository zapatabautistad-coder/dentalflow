import { describe, expect, it } from "vitest";
import { buildPatientSearchFilter } from "./patient-search";

describe("buildPatientSearchFilter", () => {
  it("construye filtros para nombre, cédula y teléfono", () => {
    expect(buildPatientSearchFilter("Ana Pérez")).toBe(
      "full_name.ilike.%Ana Pérez%,document_id.ilike.%Ana Pérez%,phone.ilike.%Ana Pérez%"
    );
  });

  it("conserva mayúsculas, acentos y espacios internos", () => {
    expect(buildPatientSearchFilter("  ÁNGELES Núñez  ")).toBe(
      "full_name.ilike.%ÁNGELES Núñez%,document_id.ilike.%ÁNGELES Núñez%,phone.ilike.%ÁNGELES Núñez%"
    );
  });

  it("agrega la versión de solo dígitos cuando la búsqueda contiene números", () => {
    expect(buildPatientSearchFilter(" 809-555-0123 ")).toBe(
      "full_name.ilike.%809-555-0123%,document_id.ilike.%809-555-0123%,phone.ilike.%809-555-0123%,document_id.ilike.%8095550123%,phone.ilike.%8095550123%"
    );
  });

  it("elimina caracteres especiales del filtro de PostgREST", () => {
    expect(buildPatientSearchFilter('Ana%*,()"\\')).toBe(
      "full_name.ilike.%Ana%,document_id.ilike.%Ana%,phone.ilike.%Ana%"
    );
  });

  it("devuelve null para una búsqueda vacía o solo con espacios", () => {
    expect(buildPatientSearchFilter("")).toBeNull();
    expect(buildPatientSearchFilter("   ")).toBeNull();
  });

  it("devuelve null cuando la entrada solo contiene caracteres inválidos", () => {
    expect(buildPatientSearchFilter('%*,()"\\')).toBeNull();
  });
});
