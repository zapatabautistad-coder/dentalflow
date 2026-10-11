import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SecurityForm } from "./security-form";

export const metadata: Metadata = { title: "Seguridad · DentalFlow" };

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mfa?: string }>;
}) {
  const supabase = await createClient();
  const [profile, params, factorResult] = await Promise.all([
    requireProfile(),
    searchParams,
    supabase.auth.mfa.listFactors(),
  ]);
  const required = profile.role === "admin" || profile.role === "doctor";

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="security.title">
          Seguridad
        </h1>
        <p className="mt-1 text-sm text-slate-600" data-i18n="security.subtitle">
          Protege tu cuenta con una app autenticadora.
        </p>
      </header>
      <SecurityForm
        required={required}
        initialRequiredNotice={params.mfa === "required"}
        initialCheckError={params.error === "check"}
        initialFactors={(factorResult.data?.totp ?? []).map(({ id, status }) => ({
          id,
          status,
        }))}
        initialLoadError={Boolean(factorResult.error)}
      />
    </section>
  );
}
