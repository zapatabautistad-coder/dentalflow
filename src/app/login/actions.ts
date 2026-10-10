"use server";

import { redirect } from "next/navigation";
import { getMfaDecision } from "@/lib/mfa";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : error.code === "user_banned"
            ? "Esta cuenta está desactivada. Habla con el administrador de la clínica."
            : "No se pudo iniciar sesión. Inténtalo de nuevo.",
    };
  }

  // El redirect de una server action pinta la página destino en la misma respuesta,
  // sin pasar por el proxy (que es quien pide el segundo paso). Por eso aquí se decide
  // el destino con la misma regla (src/lib/mfa.ts): nunca se pinta /panel a quien
  // todavía debe verificar o activar la app autenticadora.
  const [{ data: profile }, { data: assurance }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", data.user.id).single(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!profile || !assurance) redirect("/seguridad?error=check");

  const hasVerifiedTotp = (data.user.factors ?? []).some(
    (factor) => factor.factor_type === "totp" && factor.status === "verified"
  );
  const decision = getMfaDecision(profile.role, hasVerifiedTotp, assurance.currentLevel);
  if (decision === "verificar") redirect("/login/verificar");
  if (decision === "activar") redirect("/seguridad?mfa=required");
  redirect("/panel");
}
