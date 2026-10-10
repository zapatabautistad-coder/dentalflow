import type { Role } from "@/lib/auth-roles";

export type MfaDecision = "activar" | "verificar" | "ok";
export type AssuranceLevel = "aal1" | "aal2" | null;

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
