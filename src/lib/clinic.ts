import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Clinic = {
  name: string;
  address: string | null;
  phone: string | null;
  taxId: string | null;
};

type ClinicRow = { name: string; address: string | null; phone: string | null; tax_id: string | null };

// Solo servidor. Clínica del usuario con sesión (la decide la base con get_my_clinic()).
// Devuelve null si no hay sesión o falla la lectura: nunca un nombre inventado.
export const getMyClinic = cache(async (): Promise<Clinic | null> => {
  const supabase = await createClient();
  const { data: clinicId, error: rpcError } = await supabase.rpc("get_my_clinic");
  if (rpcError || !clinicId) return null;

  const { data, error } = await supabase
    .from("clinics")
    .select("name, address, phone, tax_id")
    .eq("id", clinicId)
    .maybeSingle<ClinicRow>();
  if (error || !data) return null;

  return {
    name: data.name,
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    taxId: data.tax_id?.trim() || null,
  };
});
