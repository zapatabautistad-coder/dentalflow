import type { Role } from "@/lib/auth-roles";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Ver RLS en 035_encounters.sql: abren doctor y asistente dental; cierra solo el doctor.
export function canOpenEncounter(role: Role) {
  return role === "doctor" || role === "enfermeria";
}

export function canCloseEncounter(role: Role) {
  return role === "doctor";
}

// Consulta abierta más reciente del paciente. Si no hay (o falla la consulta) devuelve null
// y el registro se guarda suelto, como antes de las consultas.
export async function getOpenEncounterId(supabase: ServerClient, patientId: string): Promise<string | null> {
  const { data } = await supabase
    .from("encounters")
    .select("id")
    .eq("patient_id", patientId)
    .eq("status", "abierta")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}
