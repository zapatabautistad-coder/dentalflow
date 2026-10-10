import { defineConfig } from "@playwright/test";

// Pruebas de punta a punta. Corren SOLO contra una copia local de Supabase
// (ver e2e/README.md): crean pacientes, citas y cobros que la base no deja borrar.
export default defineConfig({
  testDir: "e2e",
  // Activa la verificación en dos pasos de admin y doctor de prueba (ver e2e/mfa.ts).
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    locale: "es-DO",
    timezoneId: "America/Santo_Domingo",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.E2E_CHROMIUM ?? undefined },
  },
});
