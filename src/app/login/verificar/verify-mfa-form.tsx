"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "../../(app)/actions";

type VerifiedFactor = { id: string };

export function VerifyMfaForm({
  initialFactorId,
  initialLoadError,
}: {
  initialFactorId: string | null;
  initialLoadError: boolean;
}) {
  const router = useRouter();
  const [factor, setFactor] = useState<VerifiedFactor | null>(
    initialFactorId ? { id: initialFactorId } : null
  );
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialLoadError ? "security.errorLoad" : null
  );

  const findFactor = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] =
      await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
    setLoading(false);

    if (factorsError || assuranceError) {
      setError("security.errorLoad");
      return;
    }

    const verified = factors.totp.find((item) => item.status === "verified");
    if (!verified || assurance.currentLevel === "aal2") {
      router.replace("/panel");
      return;
    }
    setFactor({ id: verified.id });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!factor || !/^\d{6}$/.test(code)) {
      setError("security.errorCode");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) {
      setBusy(false);
      setError("security.errorCode");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError("security.errorCode");
      return;
    }

    router.replace("/panel");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          data-i18n={error}
        >
          {error === "security.errorCode"
            ? "Código incorrecto o vencido. Intenta de nuevo."
            : "No se pudo cargar la configuración de seguridad. Inténtalo de nuevo."}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-600" data-i18n="security.loading">
          Cargando la configuración de seguridad…
        </p>
      ) : factor ? (
        <form onSubmit={submit} className="space-y-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span data-i18n="security.code">Código de 6 dígitos</span>
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className="glass-input"
            />
          </label>
          <button type="submit" disabled={busy} className="glass-button min-h-11 w-full text-sm font-semibold">
            <span data-i18n={busy ? "security.working" : "security.verify"}>
              {busy ? "Verificando…" : "Verificar"}
            </span>
          </button>
        </form>
      ) : error ? (
        <button
          type="button"
          onClick={() => void findFactor()}
          className="glass-button min-h-11 w-full text-sm font-semibold"
        >
          <span data-i18n="security.retry">Reintentar</span>
        </button>
      ) : null}
      {/* Sin el segundo paso no se entra a la app (ni a /seguridad): la salida es cerrar sesión. */}
      <form action={logout}>
        <button type="submit" className="block w-full text-center text-sm font-semibold text-[#0766B5] hover:underline" data-i18n="sidebar.logout">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
