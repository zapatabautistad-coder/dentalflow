import type { Role } from "@/lib/auth-roles";

export type MfaDecision = "activar" | "verificar" | "ok";
export type AssuranceLevel = string | null;

export function getMfaDecision(
  role: Role,
  hasVerifiedFactor: boolean,
  level: AssuranceLevel
): MfaDecision {
  if (!hasVerifiedFactor) {
    return role === "admin" || role === "doctor" ? "activar" : "ok";
  }

  return level === "aal2" ? "ok" : "verificar";
}

export type TotpFactor = { id: string; status: "verified" | "unverified" };

// listFactors().totp trae solo los verificados; los pendientes (un intento sin
// confirmar) están en .all y hay que verlos para poder borrarlos.
export function totpFactors(
  all: { id: string; factor_type: string; status: string }[]
): TotpFactor[] {
  return all
    .filter((factor) => factor.factor_type === "totp")
    .map(({ id, status }) => ({ id, status: status === "verified" ? "verified" : "unverified" }));
}
