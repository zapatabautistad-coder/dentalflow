import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión · DentalFlow" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-sm p-5 sm:p-8">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-4 flex h-[240px] w-[240px] items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full blur-xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(125,211,252,0.6) 0%, rgba(125,211,252,0) 70%)",
              }}
            />
            <Image
              src="/dentalflow-app-icon-3d.png"
              alt="DentalFlow"
              width={640}
              height={640}
              priority
              className="relative h-[240px] w-[240px] drop-shadow-[0_18px_22px_rgba(3,105,161,0.22)]"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#0369A1]">DentalFlow</h1>
          <p className="mt-1 text-sm text-slate-500">
            Inicia sesión para continuar
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#7DD3FC]/60 bg-[#7DD3FC]/15 px-3 py-1 text-xs font-semibold text-[#0369A1]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Acceso solo para personal autorizado
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿No tienes cuenta? Pídesela al administrador de la clínica.
        </p>
      </div>
    </main>
  );
}
