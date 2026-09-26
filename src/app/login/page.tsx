import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión · DentalFlow" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <Image
            src="/dentalflow-icon.png"
            alt="DentalFlow"
            width={72}
            height={72}
            className="mx-auto mb-4 h-16 w-16 drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold">DentalFlow</h1>
          <p className="mt-1 text-sm text-slate-500">
            Inicia sesión para continuar
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
