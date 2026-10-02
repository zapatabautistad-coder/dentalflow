import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "@/lib/auth-headers";
import type { Role } from "@/lib/auth-roles";

export { ROLE_LABELS, type Role } from "@/lib/auth-roles";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  role: Role;
};

// Roles que pueden editar y archivar pacientes (ver RLS en 001_mvp.sql).
export function canManagePatients(role: Role) {
  return role === "admin" || role === "recepcion";
}

// Roles que pueden registrar pacientes nuevos (ver RLS en 013_enfermeria_crea_pacientes.sql).
// Enfermería puede crear la ficha pero no editarla ni archivarla después.
export function canCreatePatients(role: Role) {
  return role === "admin" || role === "recepcion" || role === "enfermeria";
}

// Roles que pueden escribir en el registro clínico (ver RLS en 012_clinical_entries.sql).
export function canWriteClinicalEntries(role: Role) {
  return role === "doctor" || role === "enfermeria";
}

// Solo el doctor registra hallazgos del odontograma (ver RLS en 018_odontogram.sql).
export function canWriteOdontogram(role: Role) {
  return role === "doctor";
}

// Roles que pueden crear, editar y cancelar citas (ver RLS en 001_mvp.sql
// y 003_doctor_status_update.sql). El doctor solo cambia el estado de las suyas.
export function canManageAppointments(role: Role) {
  return role === "admin" || role === "recepcion";
}

// Obtiene el perfil de la sesión actual o redirige a /login.
// El proxy ya protege las rutas y ya validó al usuario con getUser(); aquí
// reutilizamos ese resultado (vía header interno) en vez de repetir la
// llamada de red. cache() además deduplica entre el layout y la página
// dentro de un mismo request.
// Si el header no llega (p. ej. una ruta fuera del matcher del proxy),
// caemos de vuelta a getUser() como comprobación definitiva.
export const requireProfile = cache(async (): Promise<SessionProfile> => {
  const supabase = await createClient();
  const headerList = await headers();
  const validatedUserId = headerList.get(USER_ID_HEADER);

  let userId: string;
  let email: string | null;

  if (validatedUserId) {
    userId = validatedUserId;
    email = headerList.get(USER_EMAIL_HEADER);
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    userId = user.id;
    email = user.email ?? null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  // Sin fila en profiles no hay rol legítimo que asignar: nunca se asume uno
  // por defecto, se cierra la sesión y se manda a /login.
  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    userId,
    email,
    fullName: profile.full_name || "Sin nombre",
    role: profile.role as Role,
  };
});
