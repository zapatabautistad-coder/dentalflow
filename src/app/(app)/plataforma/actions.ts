"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { isStrongPassword, PASSWORD_RULE_TEXT } from "@/lib/password";

export type PlatformFormState = { error?: string; success?: string } | undefined;

const NOT_ALLOWED = "Solo un administrador de la plataforma puede hacer esto.";

async function requirePlatformAdmin() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true ? supabase : null;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createClinic(_prev: PlatformFormState, formData: FormData): Promise<PlatformFormState> {
  const supabase = await requirePlatformAdmin();
  if (!supabase) return { error: NOT_ALLOWED };

  const name = text(formData, "name");
  const address = text(formData, "address");
  const phone = text(formData, "phone");
  const taxId = text(formData, "tax_id");
  const adminName = text(formData, "admin_name");
  const adminEmail = text(formData, "admin_email").toLowerCase();
  const adminPassword = String(formData.get("admin_password") ?? "");

  if (name.length < 2) return { error: "Escribe el nombre de la clínica." };
  if (name.length > 120) return { error: "El nombre admite hasta 120 caracteres." };
  if (address.length > 200) return { error: "La dirección admite hasta 200 caracteres." };
  if (phone.length > 30) return { error: "El teléfono admite hasta 30 caracteres." };
  if (taxId.length > 30) return { error: "El RNC admite hasta 30 caracteres." };
  if (adminName.length < 3) return { error: "Escribe el nombre completo del primer administrador." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return { error: "El correo del administrador no es válido." };
  if (!isStrongPassword(adminPassword)) return { error: `Contraseña débil. ${PASSWORD_RULE_TEXT}` };

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Falta configurar la clave del servidor (SUPABASE_SERVICE_ROLE_KEY). Avísale al encargado técnico." };
  }

  // 1. La clínica. Si falla aquí todavía no existe nada.
  const { data: clinicId, error: clinicError } = await supabase.rpc("platform_create_clinic", {
    p_name: name,
    p_address: address || null,
    p_phone: phone || null,
    p_tax_id: taxId || null,
  });
  if (clinicError || !clinicId) return { error: "No se pudo crear la clínica. Inténtalo de nuevo." };

  // 2. El usuario, con la clínica en app_metadata (solo el servidor la puede escribir).
  const { data, error } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName },
    app_metadata: { clinic_id: clinicId },
  });
  revalidatePath("/plataforma");
  if (error || !data.user) {
    const reason =
      error?.code === "email_exists"
        ? "Ya existe una cuenta con ese correo."
        : error?.code === "weak_password"
          ? `Contraseña débil. ${PASSWORD_RULE_TEXT}`
          : "No se pudo crear el usuario.";
    return { error: `La clínica "${name}" se creó, pero ${reason} Nada se borró: la clínica quedó sin administrador.` };
  }

  // 3. Nombrarlo primer administrador.
  const { error: assignError } = await supabase.rpc("platform_assign_first_admin", {
    p_user: data.user.id,
    p_clinic: clinicId,
  });
  if (assignError) {
    return {
      error: `La clínica "${name}" y el usuario ${adminEmail} se crearon, pero no se pudo asignar el rol de administrador. Nada se borró; avísale al encargado técnico.`,
    };
  }

  return { success: `Clínica "${name}" creada. Entrégale la contraseña temporal a ${adminName} en persona.` };
}

export async function setClinicActive(clinicId: string, active: boolean): Promise<PlatformFormState> {
  const supabase = await requirePlatformAdmin();
  if (!supabase) return { error: NOT_ALLOWED };

  const { error } = await supabase.rpc("platform_set_clinic_active", { p_clinic: clinicId, p_active: active });
  revalidatePath("/plataforma");
  if (error) return { error: active ? "No se pudo activar la clínica." : "No se pudo desactivar la clínica." };
  return undefined;
}
