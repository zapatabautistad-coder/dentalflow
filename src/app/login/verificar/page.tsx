import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageBridge } from "../../(app)/language-bridge";
import { VerifyMfaForm } from "./verify-mfa-form";

export const metadata: Metadata = { title: "Verificar inicio de sesión · DentalFlow" };

export default async function VerifyMfaPage() {
  const supabase = await createClient();
  const [{ data: factors, error: factorError }, { data: assurance, error: assuranceError }] =
    await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
  const verifiedFactor = factors?.totp.find((factor) => factor.status === "verified");

  if (!factorError && !assuranceError && (!verifiedFactor || assurance.currentLevel === "aal2")) {
    redirect("/panel");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <LanguageBridge />
      <section className="glass-card w-full max-w-md space-y-5 p-5 sm:p-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0766B5]" data-i18n="security.verifyTitle">
            Verificación en dos pasos
          </h1>
          <p className="mt-2 text-sm text-slate-600" data-i18n="security.verifyHint">
            Escribe el código de tu app autenticadora para continuar.
          </p>
        </div>
        <VerifyMfaForm
          initialFactorId={verifiedFactor?.id ?? null}
          initialLoadError={Boolean(factorError || assuranceError)}
        />
      </section>
    </main>
  );
}
