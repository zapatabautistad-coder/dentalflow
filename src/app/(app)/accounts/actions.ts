"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, ROLE_LABELS, type Role } from "@/lib/auth";
import { isStrongPassword, PASSWORD_RULE_TEXT } from "@/lib/password";

export type AccountFormState = { error?: string; success?: string } | undefined;

// Bloqueo de inicio de sesión en Supabase Auth mientras la cuenta esté
// desactivada (~100 años). "none" lo quita.
const BAN_FOREVER = "876000h";

const MISSING_KEY_ERROR =
  "Falta configurar la clave del servidor (SUPABASE_SERVICE_ROLE_KEY). Avísale al encargado técnico.";

function isRole(value: string): value is Role {
  return value in ROLE_LABELS;
}

async function requireAdmin() {
  const profile = await requireProfile();
  return profile.role === "admin" ? profile : null;
}

export async function createAccount(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  if (!(await requireAdmin())) return { error: "Solo un administrador puede crear cuentas." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (fullName.length < 3) return { error: "Escribe el nombre completo." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El correo no es válido." };
  if (!isRole(role)) return { error: "Selecciona un rol." };
  if (!isStrongPassword(password)) return { error: `Contraseña débil. ${PASSWORD_RULE_TEXT}` };

  const admin = createAdminClient();
  if (!admin) return { error: MISSING_KEY_ERROR };

  // La clínica del usuario nuevo es la del admin que lo crea (con su sesión).
  const supabase = await createClient();
  const { data: clinicId, error: clinicError } = await supabase.rpc("get_my_clinic");
  if (clinicError || !clinicId) {
    return { error: "No se pudo determinar tu clínica, así que no se creó la cuenta. Avísale al encargado técnico." };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { clinic_id: clinicId },
    // Nace bloqueada: solo se desbloquea cuando el rol ya quedó asignado.
    ban_duration: BAN_FOREVER,
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") return { error: "Ya existe una cuenta con ese correo." };
    if (error?.code === "weak_password") return { error: `Contraseña débil. ${PASSWORD_RULE_TEXT}` };
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  // El trigger handle_new_user ya creó el perfil con el rol por defecto. El rol
  // lo asigna el admin con su propia sesión para que la auditoría lo registre
  // como autor. Mientras no quede asignado, la cuenta sigue bloqueada en Auth.
  const { data: updated, error: roleError } = await supabase
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", data.user.id)
    .select("id");

  revalidatePath("/accounts");
  if (roleError || !updated?.length) {
    return {
      error:
        "La cuenta se creó pero quedó bloqueada porque no se pudo asignar el rol. Asígnalo en la lista y reactívala.",
    };
  }

  const { error: unbanError } = await admin.auth.admin.updateUserById(data.user.id, { ban_duration: "none" });
  if (unbanError) {
    return {
      error:
        "La cuenta se creó con su rol, pero no se pudo desbloquear su inicio de sesión. Reactívala desde la lista.",
    };
  }
  return { success: `Cuenta creada para ${fullName}. Entrégale la contraseña temporal en persona.` };
}

export async function changeRole(
  userId: string,
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const profile = await requireAdmin();
  if (!profile) return { error: "Solo un administrador puede cambiar roles." };
  if (profile.userId === userId) return { error: "No puedes cambiar tu propio rol." };

  const role = String(formData.get("role") ?? "");
  if (!isRole(role)) return { error: "Selecciona un rol." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    return {
      error: error.message.includes("al menos un administrador")
        ? "Debe quedar al menos un administrador activo."
        : "No se pudo cambiar el rol. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/accounts");
  return { success: "Rol actualizado." };
}

export async function deactivateAccount(
  userId: string,
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const profile = await requireAdmin();
  if (!profile) return { error: "Solo un administrador puede desactivar cuentas." };
  if (profile.userId === userId) return { error: "No puedes desactivar tu propia cuenta." };

  const reason = String(formData.get("deactivated_reason") ?? "").trim();
  if (reason.length < 5) return { error: "Escribe el motivo (mínimo 5 caracteres)." };
  if (reason.length > 500) return { error: "El motivo admite hasta 500 caracteres." };

  const admin = createAdminClient();
  if (!admin) return { error: MISSING_KEY_ERROR };

  // Primero el perfil: al quedar inactivo pierde el acceso a los datos al
  // instante (RLS). Luego se bloquea el inicio de sesión en Auth.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active: false, deactivated_reason: reason })
    .eq("id", userId);
  if (error) {
    return {
      error: error.message.includes("al menos un administrador")
        ? "Debe quedar al menos un administrador activo."
        : "No se pudo desactivar la cuenta. Inténtalo de nuevo.",
    };
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
  revalidatePath("/accounts");
  if (banError) {
    return {
      error:
        "La cuenta quedó desactivada y ya no ve ningún dato, pero no se pudo bloquear su inicio de sesión. Inténtalo de nuevo.",
    };
  }
  return undefined;
}

export async function reactivateAccount(userId: string): Promise<AccountFormState> {
  const profile = await requireAdmin();
  if (!profile) return { error: "Solo un administrador puede reactivar cuentas." };

  const admin = createAdminClient();
  if (!admin) return { error: MISSING_KEY_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active: true }).eq("id", userId);
  if (error) return { error: "No se pudo reactivar la cuenta. Inténtalo de nuevo." };

  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  revalidatePath("/accounts");
  if (unbanError) {
    return { error: "La cuenta quedó activa, pero no se pudo desbloquear su inicio de sesión. Inténtalo de nuevo." };
  }
  return undefined;
}
