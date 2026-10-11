"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "../../(app)/actions";

type VerifiedFactor = { id: string };

export function VerifyMfaForm({
  initialTotpFactorId,
  initialWebauthnFactorId,
  initialLoadError,
}: {
  initialTotpFactorId: string | null;
  initialWebauthnFactorId: string | null;
  initialLoadError: boolean;
}) {
  const router = useRouter();
  const [factor, setFactor] = useState<VerifiedFactor | null>(
    initialTotpFactorId ? { id: initialTotpFactorId } : null
  );
  const [webauthnFactor, setWebauthnFactor] = useState<VerifiedFactor | null>(
    initialWebauthnFactorId ? { id: initialWebauthnFactorId } : null
  );
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialLoadError ? "security.errorLoad" : null
  );

  useEffect(() => {
    let cancelled = false;
    const checkSupport = async () => {
      if (
        typeof window === "undefined" ||
        !window.PublicKeyCredential ||
        typeof window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable !== "function"
      ) {
        return;
      }
      try {
        const available =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!cancelled) setPlatformAvailable(available);
      } catch {
        if (!cancelled) setPlatformAvailable(false);
      }
    };
    void checkSupport();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const verifiedWebauthn = factors.all.find(
      (item) => item.factor_type === "webauthn" && item.status === "verified"
    );
    if (assurance.currentLevel === "aal2") {
      router.replace("/panel");
      return;
    }
    setFactor(verified ? { id: verified.id } : null);
    setWebauthnFactor(verifiedWebauthn ? { id: verifiedWebauthn.id } : null);
  };

  const verifyWithFingerprint = async () => {
    if (!webauthnFactor) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.webauthn.authenticate({
      factorId: webauthnFactor.id,
      webauthn: {
        rpId: window.location.hostname,
        rpOrigins: [window.location.origin],
      },
    });
    setBusy(false);
    if (verifyError) {
      setError("security.errorFingerprintVerify");
      return;
    }
    router.replace("/panel");
    router.refresh();
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
            : error === "security.errorFingerprintVerify"
              ? "No se pudo verificar la huella o la operación fue cancelada. Usa el código de tu app autenticadora."
            : "No se pudo cargar la configuración de seguridad. Inténtalo de nuevo."}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-600" data-i18n="security.loading">
          Cargando la configuración de seguridad…
        </p>
      ) : factor || webauthnFactor ? (
        <div className="space-y-4">
          {platformAvailable && webauthnFactor && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void verifyWithFingerprint()}
              className="glass-button flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold"
            >
              <FingerprintIcon />
              <span data-i18n="security.useFingerprint">Usar huella</span>
            </button>
          )}
          {factor && (
            <>
              <div className="flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
                <span className="h-px flex-1 bg-[#0E9BF3]/20" />
                <span data-i18n="security.orCode">o usa el código</span>
                <span className="h-px flex-1 bg-[#0E9BF3]/20" />
              </div>
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
            </>
          )}
        </div>
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

function FingerprintIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" d="M12 3a7 7 0 0 0-7 7m14 0a7 7 0 0 0-7-7m-4 7a4 4 0 0 1 8 0c0 5-1 8-4 11m-4-11a4 4 0 0 1 8 0c0 3-.4 5.3-1.4 7.2M8 10a4 4 0 0 1 8 0c0 4.8-1.3 8-4 10.5M12 10c1.1 0 2 .9 2 2 0 2.6-.4 4.8-1.2 6.5" />
    </svg>
  );
}
