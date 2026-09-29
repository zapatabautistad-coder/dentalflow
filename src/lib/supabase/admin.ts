import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la clave service_role: salta RLS. Solo para la API de
// administración de Auth (crear, bloquear y desbloquear cuentas) y solo desde
// Server Actions/Components que ya comprobaron que el usuario es admin.
// Los cambios de datos (rol, desactivar) se hacen con el cliente normal del
// admin para que la auditoría registre quién los hizo.
// Devuelve null si falta la clave (p. ej. en local sin .env.local).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
