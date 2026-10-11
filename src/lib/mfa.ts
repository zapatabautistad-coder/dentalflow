import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/auth-roles";

export type MfaDecision = "activar" | "verificar" | "ok";
export type AssuranceLevel = string | null;
export type MfaFactor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
  created_at?: string;
};

export function hasVerifiedSecondFactor(factors: MfaFactor[]): boolean {
  return factors.some(
    (factor) =>
      (factor.factor_type === "totp" || factor.factor_type === "webauthn") &&
      factor.status === "verified"
  );
}

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
  all: MfaFactor[]
): TotpFactor[] {
  return all
    .filter((factor) => factor.factor_type === "totp")
    .map(({ id, status }) => ({ id, status: status === "verified" ? "verified" : "unverified" }));
}

export function webauthnFactors(all: MfaFactor[]): MfaFactor[] {
  return all.filter((factor) => factor.factor_type === "webauthn");
}

// Supabase pide por defecto una llave de seguridad USB (cross-platform). Para usar la
// huella o el desbloqueo del propio equipo (Touch ID, Windows Hello, celular) se pide
// el autenticador del dispositivo y verificación obligatoria (huella, rostro o PIN).
type WebauthnApi = SupabaseClient["auth"]["mfa"]["webauthn"];

export const WEBAUTHN_CREATE_OPTIONS: Parameters<WebauthnApi["register"]>[1] = {
  hints: ["client-device"],
  authenticatorSelection: {
    authenticatorAttachment: "platform",
    userVerification: "required",
    residentKey: "discouraged",
    requireResidentKey: false,
  },
};

// El tipo de Supabase pide `challenge`, pero solo se mezcla con las opciones del servidor.
export const WEBAUTHN_REQUEST_OPTIONS = {
  hints: ["client-device"],
  userVerification: "required",
} as Parameters<WebauthnApi["authenticate"]>[1];
