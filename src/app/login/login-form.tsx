"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nombre@clinica.com"
          className="glass-input"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="glass-input"
        />
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="glass-button mt-2">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
