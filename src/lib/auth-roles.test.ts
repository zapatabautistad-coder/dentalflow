import { describe, expect, it } from "vitest";
import { ROLE_LABELS, type Role } from "./auth-roles";

describe("ROLE_LABELS", () => {
  it("expone una etiqueta visible para cada rol válido", () => {
    expect(ROLE_LABELS).toEqual({
      doctor: "Doctor",
      recepcion: "Recepción",
      enfermeria: "Asistente dental",
      admin: "Admin",
    } satisfies Record<Role, string>);
  });

  it("mantiene exactamente los cuatro roles soportados", () => {
    expect(Object.keys(ROLE_LABELS)).toEqual([
      "doctor",
      "recepcion",
      "enfermeria",
      "admin",
    ]);
  });

  it("no devuelve una etiqueta para un rol inválido", () => {
    expect(Object.prototype.hasOwnProperty.call(ROLE_LABELS, "invitado")).toBe(false);
  });
});
