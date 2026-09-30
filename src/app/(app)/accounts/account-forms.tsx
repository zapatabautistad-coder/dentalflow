"use client";

import { useActionState, useEffect, useRef } from "react";
import { ROLE_LABELS, type Role } from "@/lib/auth-roles";
import { PASSWORD_RULE_TEXT } from "@/lib/password";
import type { AccountFormState } from "./actions";

type Action = (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

function Message({ state }: { state: AccountFormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.error}
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

const PRIMARY_BUTTON = "glass-button min-h-11 self-start px-5 text-[15px] font-semibold disabled:opacity-60";

export function CreateAccountForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        Nombre completo
        <input name="full_name" required minLength={3} maxLength={120} autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        Correo
        <input name="email" type="email" required autoComplete="off" className="glass-input text-[15px]" />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        Contraseña temporal
        <input
          name="password"
          type="text"
          required
          minLength={10}
          autoComplete="new-password"
          spellCheck={false}
          className="glass-input font-mono text-[15px]"
        />
        <span className="text-xs font-normal text-slate-500">{PASSWORD_RULE_TEXT}</span>
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
        Rol
        <select name="role" required defaultValue="" className="glass-input text-[15px]">
          <option value="" disabled>
            Selecciona…
          </option>
          {ROLES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex min-w-0 flex-col gap-3 md:col-span-2">
        <Message state={state} />
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </div>
    </form>
  );
}

export function ChangeRoleForm({ action, currentRole }: { action: Action; currentRole: Role }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
          Rol
          <select name="role" defaultValue={currentRole} className="glass-input min-h-11 text-[15px]">
            {ROLES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl border border-[#0766B5]/30 bg-white/60 px-3 text-sm font-semibold text-[#0766B5] transition hover:bg-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Cambiar rol"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function DeactivateForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <details className="rounded-xl border border-slate-200 bg-white/50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">Desactivar cuenta</summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-slate-600">
          La persona deja de poder entrar y pierde el acceso a todos los datos al instante. Su historial de cambios
          se conserva y la cuenta se puede reactivar.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Motivo (obligatorio)
          <textarea
            name="deactivated_reason"
            required
            minLength={5}
            maxLength={500}
            rows={2}
            placeholder="Ej.: ya no trabaja en la clínica"
            className="glass-input resize-none text-[15px]"
          />
        </label>
        <Message state={state} />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 self-start rounded-xl border border-rose-300 bg-rose-50 px-4 text-[15px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {pending ? "Desactivando…" : "Confirmar desactivación"}
        </button>
      </form>
    </details>
  );
}

export function ReactivateForm({ action }: { action: () => Promise<AccountFormState> }) {
  const [state, formAction, pending] = useActionState(async () => action(), undefined);

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-start rounded-xl border border-[#0766B5]/30 bg-white/60 px-4 text-sm font-semibold text-[#0766B5] transition hover:bg-white disabled:opacity-60"
      >
        {pending ? "Reactivando…" : "Reactivar cuenta"}
      </button>
      <Message state={state} />
    </form>
  );
}
