import { describe, expect, it } from "vitest";
import {
  getMfaDecision,
  hasVerifiedSecondFactor,
  totpFactors,
  verifiedWebauthnOptions,
} from "./mfa";

describe("hasVerifiedSecondFactor", () => {
  it("considera un TOTP verificado", () => {
    expect(hasVerifiedSecondFactor([{ id: "totp", factor_type: "totp", status: "verified" }])).toBe(true);
  });

  it("considera una huella verificada", () => {
    expect(hasVerifiedSecondFactor([{ id: "webauthn", factor_type: "webauthn", status: "verified" }])).toBe(true);
  });

  it("ignora factores no verificados", () => {
    expect(hasVerifiedSecondFactor([{ id: "pending", factor_type: "webauthn", status: "unverified" }])).toBe(false);
  });

  it("devuelve false cuando no hay factores", () => {
    expect(hasVerifiedSecondFactor([])).toBe(false);
  });
});

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

describe("totpFactors", () => {
  it("incluye los pendientes y descarta otros tipos", () => {
    expect(
      totpFactors([
        { id: "a", factor_type: "totp", status: "verified" },
        { id: "b", factor_type: "totp", status: "unverified" },
        { id: "c", factor_type: "phone", status: "verified" },
      ])
    ).toEqual([
      { id: "a", status: "verified" },
      { id: "b", status: "unverified" },
    ]);
  });
});

describe("verifiedWebauthnOptions", () => {
  it("devuelve cada huella verificada con su nombre", () => {
    expect(
      verifiedWebauthnOptions([
        { id: "a", factor_type: "webauthn", status: "verified", friendly_name: "Laptop" },
        { id: "b", factor_type: "webauthn", status: "verified", friendly_name: "Celular" },
        { id: "c", factor_type: "webauthn", status: "unverified", friendly_name: "Tablet" },
        { id: "d", factor_type: "totp", status: "verified" },
      ])
    ).toEqual([
      { id: "a", name: "Laptop" },
      { id: "b", name: "Celular" },
    ]);
  });
});
