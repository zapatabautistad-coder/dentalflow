import type { Metadata } from "next";
import { requireProfile, ROLE_LABELS } from "@/lib/auth";

export const metadata: Metadata = { title: "Panel · DentalFlow" };

export default async function PanelPage() {
  const profile = await requireProfile();

  return (
    <div className="glass-card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">Hola, {profile.fullName}</h1>
      <p className="mt-1 text-sm text-slate-500">Bienvenido a DentalFlow</p>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 rounded-xl bg-white/50 px-4 py-3">
          <dt className="text-slate-500">Nombre</dt>
          <dd className="font-medium">{profile.fullName}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-xl bg-white/50 px-4 py-3">
          <dt className="text-slate-500">Correo</dt>
          <dd className="font-medium break-all">{profile.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white/50 px-4 py-3">
          <dt className="text-slate-500">Rol</dt>
          <dd>
            <span className="rounded-full bg-gradient-to-r from-brand-from to-brand-to px-3 py-1 text-xs font-semibold text-white">
              {ROLE_LABELS[profile.role]}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
