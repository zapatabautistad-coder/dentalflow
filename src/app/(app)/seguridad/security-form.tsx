"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  totpFactors,
  type MfaFactor,
  type TotpFactor,
  WEBAUTHN_CREATE_OPTIONS,
  webauthnFactors,
} from "@/lib/mfa";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function SecurityForm({
  required,
  initialRequiredNotice,
  initialCheckError,
  initialFactors,
  initialWebauthnFactors,
  initialLoadError,
}: {
  required: boolean;
  initialRequiredNotice: boolean;
  initialCheckError: boolean;
  initialFactors: TotpFactor[];
  initialWebauthnFactors: MfaFactor[];
  initialLoadError: boolean;
}) {
  const [factors, setFactors] = useState<TotpFactor[]>(initialFactors);
  const [webauthn, setWebauthn] = useState<MfaFactor[]>(initialWebauthnFactors);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [friendlyName, setFriendlyName] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(!initialLoadError);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialLoadError ? "security.errorLoad" : null
  );
  const [checkWarning] = useState(initialCheckError);
  const [notice, setNotice] = useState<string | null>(
    initialRequiredNotice ? "security.requiredNotice" : null
  );
  const [success, setSuccess] = useState<string | null>(null);

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

  const refreshFactors = async () => {
    setLoading(true);
    const { data, error: factorError } = await createClient().auth.mfa.listFactors();
    setLoading(false);
    if (factorError) {
      setError("security.errorLoad");
      return false;
    }

    setFactors(totpFactors(data.all));
    setWebauthn(webauthnFactors(data.all));
    setLoaded(true);
    setError(null);
    return true;
  };

  const activeFactor = factors.find((factor) => factor.status === "verified");
  const pendingFactor = factors.find((factor) => factor.status === "unverified");
  const activeWebauthn = webauthn.filter((factor) => factor.status === "verified");

  const startEnrollment = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    // Un intento anterior que no se confirmó (código equivocado, página recargada)
    // queda como factor sin verificar y bloquea uno nuevo con el mismo nombre: se borra.
    const { data: current, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setBusy(false);
      setError("security.errorEnroll");
      return;
    }
    for (const factor of totpFactors(current.all)) {
      if (factor.status !== "unverified") continue;
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) {
        setBusy(false);
        setError("security.errorEnroll");
        return;
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "DentalFlow",
    });
    setBusy(false);

    if (enrollError) {
      setError("security.errorEnroll");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setCode("");
    await refreshFactors();
  };

  const verifyCode = async (factorId: string) => {
    if (!/^\d{6}$/.test(code)) {
      setError("security.errorCode");
      return false;
    }

    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError("security.errorCode");
      return false;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) {
      setError("security.errorCode");
      return false;
    }
    return true;
  };

  const confirmEnrollment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    const verified = await verifyCode(enrollment.factorId);
    setBusy(false);
    if (!verified) return;

    setEnrollment(null);
    setCode("");
    setNotice(null);
    setSuccess("security.successEnabled");
    await refreshFactors();
  };

  const removeActiveFactor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeFactor) return;
    if (activeWebauthn.length > 0) {
      setError("security.removeTotpFirst");
      return;
    }
    setBusy(true);
    setError(null);
    const verified = await verifyCode(activeFactor.id);
    if (!verified) {
      setBusy(false);
      return;
    }

    const { error: unenrollError } = await createClient().auth.mfa.unenroll({
      factorId: activeFactor.id,
    });
    setBusy(false);
    if (unenrollError) {
      setError("security.errorRemove");
      return;
    }

    setCode("");
    setSuccess("security.successRemoved");
    await refreshFactors();
  };

  const addWebauthn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = friendlyName.trim();
    if (!name || name.length > 100) {
      setError("security.errorFingerprintName");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    // Si se canceló el aviso del equipo, Supabase deja la huella a medio registrar y
    // rechaza otra con el mismo nombre: se quita antes de intentarlo de nuevo.
    const { data: current } = await supabase.auth.mfa.listFactors();
    for (const pending of webauthnFactors(current?.all ?? [])) {
      if (pending.status !== "verified" && pending.friendly_name === name) {
        await supabase.auth.mfa.unenroll({ factorId: pending.id });
      }
    }
    const { error: enrollError } = await supabase.auth.mfa.webauthn.register({
      friendlyName: name,
      webauthn: {
        rpId: window.location.hostname,
        rpOrigins: [window.location.origin],
      },
    }, WEBAUTHN_CREATE_OPTIONS);
    setBusy(false);
    if (enrollError) {
      setError("security.errorFingerprint");
      return;
    }

    setFriendlyName("");
    setSuccess("security.fingerprintAdded");
    await refreshFactors();
  };

  const removeWebauthn = async (factorId: string) => {
    setBusy(true);
    setError(null);
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({
      factorId,
    });
    setBusy(false);
    if (unenrollError) {
      setError("security.errorFingerprintRemove");
      return;
    }
    setSuccess("security.fingerprintRemoved");
    await refreshFactors();
  };

  const removePendingFactor = async () => {
    if (!pendingFactor) return;
    setBusy(true);
    setError(null);
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({
      factorId: pendingFactor.id,
    });
    setBusy(false);
    if (unenrollError) {
      setError("security.errorRemove");
      return;
    }
    setEnrollment(null);
    setSuccess("security.pendingRemoved");
    await refreshFactors();
  };

  const handleCodeChange = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setError(null);
  };

  return (
    <div className="space-y-5">
      {required && !activeFactor && !loading && !notice && (
        <div
          role="alert"
          className="rounded-xl border border-[#95D3FA]/70 bg-white/70 px-4 py-3 text-sm text-[#0766B5]"
          data-i18n="security.requiredNotice"
        >
          Para continuar usando DentalFlow, activa la verificación en dos pasos.
        </div>
      )}
      {checkWarning && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          data-i18n="security.errorCheck"
        >
          No se pudo comprobar la configuración de seguridad. Inténtalo de nuevo.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-[#95D3FA]/70 bg-white/70 px-4 py-3 text-sm text-[#0766B5]"
          data-i18n={notice}
        >
          Debes activar la app autenticadora antes de continuar.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          data-i18n={error}
        >
          No se pudo completar la operación. Inténtalo de nuevo.
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[#95D3FA]/70 bg-white/70 px-4 py-3 text-sm text-[#0766B5]"
          data-i18n={success}
        >
          Cambio guardado.
        </p>
      )}

      {loading ? (
        <div className="crystal-card rounded-[20px] p-5 text-sm text-slate-600" data-i18n="security.loading">
          Cargando la configuración de seguridad…
        </div>
      ) : !loaded ? (
        <button
          type="button"
          onClick={() => void refreshFactors()}
          className="glass-button min-h-11 px-4 text-sm font-semibold"
        >
          <span data-i18n="security.retry">Reintentar</span>
        </button>
      ) : activeFactor ? (
        <div className="space-y-5">
          <div className="crystal-card space-y-4 rounded-[20px] p-5 sm:p-6">
          <div>
            <h2 className="text-base font-black text-[#0F172A]" data-i18n="security.active">
              Verificación en dos pasos activa
            </h2>
            <p className="mt-1 text-sm text-slate-600" data-i18n="security.activeHint">
              Tu cuenta está protegida con una app autenticadora.
            </p>
          </div>
            <form onSubmit={removeActiveFactor} className="space-y-3 border-t border-[#0E9BF3]/15 pt-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              <span data-i18n="security.confirmRemoval">Confirma con un código de la app para quitarla.</span>
              <input
                value={code}
                onChange={(event) => handleCodeChange(event.target.value)}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className="glass-input"
              />
            </label>
            <button type="submit" disabled={busy} className="glass-button min-h-11 px-4 text-sm font-semibold">
              <span data-i18n={busy ? "security.working" : "security.remove"}>
                {busy ? "Procesando…" : "Quitar verificación en dos pasos"}
              </span>
            </button>
            </form>
          </div>
          {platformAvailable && (
            <div className="crystal-card space-y-4 rounded-[20px] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <FingerprintIcon />
                <div>
                  <h2 className="text-base font-black text-[#0F172A]" data-i18n="security.fingerprintTitle">
                    Huella digital
                  </h2>
                  <p className="mt-1 text-sm text-slate-600" data-i18n="security.fingerprintHint">
                    Usa Touch ID, Windows Hello o el desbloqueo de tu dispositivo como alternativa.
                  </p>
                </div>
              </div>
              <form onSubmit={addWebauthn} className="space-y-3 border-t border-[#0E9BF3]/15 pt-4">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  <span data-i18n="security.fingerprintName">Nombre de este dispositivo</span>
                  <input
                    value={friendlyName}
                    onChange={(event) => setFriendlyName(event.target.value)}
                    maxLength={100}
                    required
                    className="glass-input"
                    placeholder="Ej.: Laptop consultorio"
                    data-i18n-placeholder="security.fingerprintNamePlaceholder"
                  />
                </label>
                <button type="submit" disabled={busy} className="glass-button min-h-11 px-4 text-sm font-semibold">
                  <span data-i18n={busy ? "security.working" : "security.fingerprintAdd"}>
                    {busy ? "Procesando…" : "Agregar huella de este dispositivo"}
                  </span>
                </button>
              </form>
              {activeWebauthn.length > 0 && (
                <ul className="space-y-2 border-t border-[#0E9BF3]/15 pt-4">
                  {activeWebauthn.map((factor) => (
                    <li key={factor.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-700">
                          {factor.friendly_name || "Dispositivo sin nombre"}
                        </span>
                        {factor.created_at && (
                          <time dateTime={factor.created_at} className="text-xs text-slate-500">
                            {new Date(factor.created_at).toLocaleDateString()}
                          </time>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeWebauthn(factor.id)}
                        className="text-sm font-semibold text-[#0766B5] hover:underline"
                        data-i18n="security.fingerprintRemove"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : pendingFactor && !enrollment ? (
        <div className="crystal-card space-y-4 rounded-[20px] p-5 sm:p-6">
          <p className="text-sm text-slate-700" data-i18n="security.pending">
            Hay una configuración pendiente de la app autenticadora.
          </p>
          <button
            type="button"
            onClick={removePendingFactor}
            disabled={busy}
            className="glass-button min-h-11 px-4 text-sm font-semibold"
          >
            <span data-i18n={busy ? "security.working" : "security.pendingRemove"}>
              {busy ? "Procesando…" : "Eliminar configuración pendiente"}
            </span>
          </button>
        </div>
      ) : enrollment ? (
        <div className="crystal-card space-y-5 rounded-[20px] p-5 sm:p-6">
          <div>
            <h2 className="text-base font-black text-[#0F172A]" data-i18n="security.setupTitle">
              Configura tu app autenticadora
            </h2>
            <p className="mt-1 text-sm text-slate-600" data-i18n="security.setupHint">
              Escanea este código QR con una app autenticadora o introduce el código secreto.
            </p>
          </div>
          <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
            <Image
              src={enrollment.qrCode}
              alt="Código QR para configurar la app autenticadora"
              width={220}
              height={220}
              unoptimized
              data-i18n-alt="security.qrAlt"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-700" data-i18n="security.secret">
              Código secreto
            </p>
            <code className="block [overflow-wrap:anywhere] rounded-xl border border-[#0E9BF3]/20 bg-white/70 p-3 text-sm font-semibold tracking-wider text-[#0766B5]">
              {enrollment.secret}
            </code>
          </div>
          <form onSubmit={confirmEnrollment} className="space-y-3 border-t border-[#0E9BF3]/15 pt-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              <span data-i18n="security.code">Código de 6 dígitos</span>
              <input
                value={code}
                onChange={(event) => handleCodeChange(event.target.value)}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className="glass-input"
              />
            </label>
            <button type="submit" disabled={busy} className="glass-button min-h-11 px-4 text-sm font-semibold">
              <span data-i18n={busy ? "security.working" : "security.verifyEnable"}>
                {busy ? "Procesando…" : "Verificar y activar"}
              </span>
            </button>
          </form>
        </div>
      ) : (
        <div className="crystal-card space-y-4 rounded-[20px] p-5 sm:p-6">
          <p className="text-sm text-slate-600" data-i18n="security.setupPrompt">
            Añade una segunda capa de seguridad con una app autenticadora TOTP.
          </p>
          <button
            type="button"
            onClick={startEnrollment}
            disabled={busy}
            className="glass-button min-h-11 px-4 text-sm font-semibold"
          >
            <span data-i18n={busy ? "security.working" : "security.enroll"}>
              {busy ? "Procesando…" : "Activar app autenticadora"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function FingerprintIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-7 w-7 shrink-0 text-[#0E9BF3]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" d="M12 3a7 7 0 0 0-7 7m14 0a7 7 0 0 0-7-7m-4 7a4 4 0 0 1 8 0c0 5-1 8-4 11m-4-11a4 4 0 0 1 8 0c0 3-.4 5.3-1.4 7.2M8 10a4 4 0 0 1 8 0c0 4.8-1.3 8-4 10.5M12 10c1.1 0 2 .9 2 2 0 2.6-.4 4.8-1.2 6.5" />
    </svg>
  );
}
