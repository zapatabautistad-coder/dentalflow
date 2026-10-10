"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string;
};

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function SecurityForm({
  required,
  initialRequiredNotice,
  initialCheckError,
  initialFactors,
  initialLoadError,
}: {
  required: boolean;
  initialRequiredNotice: boolean;
  initialCheckError: boolean;
  initialFactors: TotpFactor[];
  initialLoadError: boolean;
}) {
  const [factors, setFactors] = useState<TotpFactor[]>(initialFactors);
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

  const refreshFactors = async () => {
    setLoading(true);
    const { data, error: factorError } = await createClient().auth.mfa.listFactors();
    setLoading(false);
    if (factorError) {
      setError("security.errorLoad");
      return false;
    }

    setFactors(data.totp);
    setLoaded(true);
    setError(null);
    return true;
  };

  const activeFactor = factors.find((factor) => factor.status === "verified");
  const pendingFactor = factors.find((factor) => factor.status === "unverified");

  const startEnrollment = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const { data, error: enrollError } = await createClient().auth.mfa.enroll({
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
