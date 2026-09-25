import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Panel · DentalFlow" };

const ROLE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  recepcion: "Recepción",
  admin: "Admin",
};

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El proxy ya protege la ruta; esto es la comprobación definitiva.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name || "Sin nombre";
  const role = profile ? ROLE_LABELS[profile.role] ?? profile.role : "Sin perfil";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Hola, {name}</h1>
        <p className="mt-1 text-sm text-slate-500">Bienvenido a DentalFlow</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4 rounded-xl bg-white/50 px-4 py-3">
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium">{name}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-xl bg-white/50 px-4 py-3">
            <dt className="text-slate-500">Correo</dt>
            <dd className="font-medium break-all">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-white/50 px-4 py-3">
            <dt className="text-slate-500">Rol</dt>
            <dd>
              <span className="rounded-full bg-gradient-to-r from-brand-from to-brand-to px-3 py-1 text-xs font-semibold text-white">
                {role}
              </span>
            </dd>
          </div>
        </dl>

        <form action={logout} className="mt-8">
          <button type="submit" className="glass-button-light w-full">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
