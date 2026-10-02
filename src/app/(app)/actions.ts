"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { endGuestVisit } from "@/lib/guest";

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Una cuenta temporal (visita) que sale (o al que se le cierra la sesión por inactividad)
  // queda desactivada: para volver, el admin le da acceso otra vez.
  if (user) await endGuestVisit(user.id, "Visita terminada: cerró sesión");
  await supabase.auth.signOut();
  redirect("/login");
}
