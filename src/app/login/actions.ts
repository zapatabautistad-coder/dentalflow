"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GUEST_ENDED_MESSAGE, guestBlockedOnLogin, recordGuestRequestByEmail } from "@/lib/guest";

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
    // Invitado bloqueado que intenta volver: avisar al admin.
    if (error.code === "user_banned" && (await recordGuestRequestByEmail(email))) {
      return { error: GUEST_ENDED_MESSAGE };
    }
    return {
      error:
        error.code === "invalid_credentials"
          ? "Correo o contraseña incorrectos."
          : error.code === "user_banned"
            ? "Esta cuenta está desactivada. Habla con el administrador de la clínica."
            : "No se pudo iniciar sesión. Inténtalo de nuevo.",
    };
  }

  // Invitado con el acceso vencido (cerró la pestaña sin salir): se cierra.
  if (data.user && (await guestBlockedOnLogin(data.user.id))) {
    await supabase.auth.signOut();
    return { error: GUEST_ENDED_MESSAGE };
  }

  redirect("/panel");
}
