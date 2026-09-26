import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "doctor" | "recepcion" | "admin";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  role: Role;
};

export const ROLE_LABELS: Record<Role, string> = {
  doctor: "Doctor",
  recepcion: "Recepción",
  admin: "Admin",
};

// Roles que pueden crear/editar pacientes (ver RLS en 001_mvp.sql).
export function canManagePatients(role: Role) {
  return role === "admin" || role === "recepcion";
}

// Obtiene el perfil de la sesión actual o redirige a /login.
// El proxy ya protege las rutas; esto es la comprobación definitiva.
export async function requireProfile(): Promise<SessionProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name || "Sin nombre",
    role: (profile?.role as Role) ?? "recepcion",
  };
}
