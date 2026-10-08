"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type ClinicFormState = { error?: string; success?: string } | undefined;

function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateClinic(_prev: ClinicFormState, formData: FormData): Promise<ClinicFormState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Solo un administrador puede editar los datos de la clínica." };

  const name = readText(formData, "name");
  const address = readText(formData, "address");
  const phone = readText(formData, "phone");
  const taxId = readText(formData, "tax_id");

  if (name.length < 2) return { error: "Escribe el nombre de la clínica." };
  if (name.length > 120) return { error: "El nombre admite hasta 120 caracteres." };
  if (address.length > 200) return { error: "La dirección admite hasta 200 caracteres." };
  if (phone.length > 30) return { error: "El teléfono admite hasta 30 caracteres." };
  if (taxId.length > 30) return { error: "El RNC admite hasta 30 caracteres." };

  const supabase = await createClient();
  const { data: clinicId, error: clinicError } = await supabase.rpc("get_my_clinic");
  if (clinicError || !clinicId) return { error: "No se pudo determinar tu clínica. Recarga la página e inténtalo de nuevo." };

  const { data, error } = await supabase
    .from("clinics")
    .update({ name, address: address || null, phone: phone || null, tax_id: taxId || null })
    .eq("id", clinicId)
    .select("id");
  if (error || !data?.length) return { error: "No se pudieron guardar los cambios. Inténtalo de nuevo." };

  revalidatePath("/", "layout");
  return { success: "Datos de la clínica guardados." };
}
