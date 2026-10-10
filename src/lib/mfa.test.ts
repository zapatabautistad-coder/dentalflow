import { describe, expect, it } from "vitest";
import { getMfaDecision } from "./mfa";

describe("getMfaDecision", () => {
  it.each([
    ["admin sin factor", "admin", false, "aal1", "activar"],
    ["doctor sin factor", "doctor", false, "aal1", "activar"],
    ["admin con factor y aal1", "admin", true, "aal1", "verificar"],
    ["factor con nivel desconocido", "admin", true, null, "verificar"],
    ["doctor con factor y aal1", "doctor", true, "aal1", "verificar"],
    ["recepción con factor y aal1", "recepcion", true, "aal1", "verificar"],
    ["asistente con factor y aal1", "enfermeria", true, "aal1", "verificar"],
    ["sesión aal2", "admin", true, "aal2", "ok"],
    ["recepción sin factor", "recepcion", false, "aal1", "ok"],
    ["asistente sin factor", "enfermeria", false, "aal1", "ok"],
  ] as const)("%s → %s", (_label, role, hasFactor, level, expected) => {
    expect(getMfaDecision(role, hasFactor, level)).toBe(expected);
  });
});
