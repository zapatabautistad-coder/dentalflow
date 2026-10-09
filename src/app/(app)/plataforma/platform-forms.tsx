"use client";

import { useActionState, useEffect, useRef } from "react";
import { PASSWORD_RULE_TEXT } from "@/lib/password";
import type { PlatformFormState } from "./actions";

function Message({ state }: { state: PlatformFormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.errorKey ? (
          <>
            <span data-i18n={state.errorKey}>{state.error}</span>
            {state.failedCount ? <strong> {state.failedCount}</strong> : null}
          </>
        ) : (
          state.error
        )}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.success}
      </p>
    );
  }
  return null;
}

const LABEL = "flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700";

export function NewClinicForm({ action }: { action: (prev: PlatformFormState, formData: FormData) => Promise<PlatformFormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <label className={`${LABEL} md:col-span-2`}>
        <span data-i18n="clinic.field.name">Nombre de la clínica</span>
        <input name="name" required minLength={2} maxLength={120} autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className={`${LABEL} md:col-span-2`}>
        <span data-i18n="clinic.field.address">Dirección</span>
        <input name="address" maxLength={200} autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className={LABEL}>
        <span data-i18n="clinic.field.phone">Teléfono</span>
        <input name="phone" type="tel" maxLength={30} autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className={LABEL}>
        <span data-i18n="clinic.field.taxId">RNC</span>
        <input name="tax_id" maxLength={30} autoComplete="off" className="glass-input text-[15px]" />
      </label>

      <h3 className="mt-2 text-sm font-black uppercase tracking-[0.08em] text-slate-500 md:col-span-2" data-i18n="platform.firstAdmin">
        Primer administrador
      </h3>
      <label className={`${LABEL} md:col-span-2`}>
        <span data-i18n="accounts.field.name">Nombre completo</span>
        <input name="admin_name" required minLength={3} maxLength={120} autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className={LABEL}>
        <span data-i18n="accounts.field.email">Correo</span>
        <input name="admin_email" type="email" required autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className={LABEL}>
        <span data-i18n="accounts.field.password">Contraseña temporal</span>
        <input
          name="admin_password"
          type="text"
          required
          minLength={10}
          autoComplete="new-password"
          spellCheck={false}
          className="glass-input font-mono text-[15px]"
        />
        <span className="text-xs font-normal text-slate-500" data-i18n="accounts.passwordRule">{PASSWORD_RULE_TEXT}</span>
      </label>

      <div className="flex min-w-0 flex-col gap-3 md:col-span-2">
        <Message state={state} />
        <button type="submit" disabled={pending} className="glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60">
          {pending ? "Creando…" : <span data-i18n="platform.create">Crear clínica</span>}
        </button>
      </div>
    </form>
  );
}

export function ToggleClinicForm({
  action,
  active,
  name,
}: {
  action: () => Promise<PlatformFormState>;
  active: boolean;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(async () => action(), undefined);
  const confirmText = active
    ? `¿Desactivar "${name}"? Sus usuarios perderán el acceso hasta que la actives de nuevo.`
    : `¿Activar "${name}"? Sus usuarios recuperarán el acceso.`;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className="flex min-w-0 flex-col gap-2"
    >
      <button
        type="submit"
        disabled={pending}
        className={`min-h-11 self-start rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-60 ${
          active
            ? "border-rose-300 bg-white/60 text-rose-700 hover:bg-rose-50"
            : "border-[#0766B5]/30 bg-white/60 text-[#0766B5] hover:bg-white"
        }`}
      >
        {active ? <span data-i18n="platform.deactivate">Desactivar</span> : <span data-i18n="platform.activate">Activar</span>}
      </button>
      <Message state={state} />
    </form>
  );
}
