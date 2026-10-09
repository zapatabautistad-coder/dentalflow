import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { login, open, PASSWORD } from "./helpers";

// admin@e2e.test es también administrador de plataforma (ver setup-local.sh).
test.describe.configure({ mode: "serial" });

// Flujo completo de la 030: la plataforma crea una clínica con su primer admin
// y ese admin entra y ve su propia clínica (y no la pantalla de plataforma).
test("la plataforma da de alta una clínica y su primer admin entra", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const clinicName = `Clínica Plataforma ${stamp}`;
  const email = `primer-admin-${stamp}@e2e.test`;

  await login(page, "admin");
  await open(page, "/plataforma");
  await page.locator('input[name="name"]').fill(clinicName);
  await page.locator('input[name="admin_name"]').fill("Primer Admin E2E");
  await page.locator('input[name="admin_email"]').fill(email);
  await page.locator('input[name="admin_password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Crear clínica" }).click();
  await expect(page.getByText(`Clínica "${clinicName}" creada`)).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/panel/);
  await expect(page.getByText(clinicName).filter({ visible: true }).first()).toBeVisible();

  await open(page, "/plataforma");
  await expect(page).toHaveURL(/\/panel/);
});

// Desactivar una clínica bloquea el inicio de sesión de sus usuarios en Auth;
// reactivarla desbloquea solo a los activos.
test.describe("activar y desactivar clínicas", () => {
  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const CLINIC_B = "Clínica B E2E";
  const inactiveEmail = `inactivo-b-${Date.now().toString(36)}@e2e.test`;

  async function canSignIn(email: string): Promise<boolean> {
    const client = createClient(URL, ANON);
    const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    return !error;
  }

  async function toggleClinic(page: Page, buttonName: "Desactivar" | "Activar") {
    page.once("dialog", (dialog) => dialog.accept());
    await open(page, "/plataforma");
    const card = page.locator("li", { hasText: CLINIC_B });
    await card.getByRole("button", { name: buttonName }).click();
    const next = buttonName === "Desactivar" ? "Activar" : "Desactivar";
    await expect(card.getByRole("button", { name: next })).toBeVisible();
  }

  test.beforeAll(async () => {
    // Usuario de B desactivado como lo hace Cuentas: perfil inactivo (con motivo) y bloqueo en Auth.
    const service = createClient(URL, SERVICE);
    const { data: clinic } = await service.from("clinics").select("id").eq("name", CLINIC_B).single();
    const { data: created, error } = await service.auth.admin.createUser({
      email: inactiveEmail,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { clinic_id: clinic!.id },
    });
    expect(error).toBeNull();

    const adminB = createClient(URL, ANON);
    await adminB.auth.signInWithPassword({ email: "admin-b@e2e.test", password: PASSWORD });
    const { data: updated, error: updateError } = await adminB
      .from("profiles")
      .update({ active: false, deactivated_reason: "Prueba E2E de plataforma" })
      .eq("id", created.user!.id)
      .select("id");
    expect(updateError).toBeNull();
    expect(updated).toHaveLength(1);
    const { error: banError } = await service.auth.admin.updateUserById(created.user!.id, { ban_duration: "876000h" });
    expect(banError).toBeNull();
  });

  test("la propia clínica no se puede desactivar", async ({ page }) => {
    await login(page, "admin");
    await open(page, "/plataforma");
    const ownCard = page.locator("li").filter({ hasText: "Es tu clínica" });
    await expect(ownCard).toHaveCount(1);
    await expect(ownCard.getByRole("button", { name: "Desactivar" })).toHaveCount(0);
  });

  test("desactivar la clínica bloquea el inicio de sesión de sus usuarios", async ({ page }) => {
    expect(await canSignIn("doctor-b@e2e.test")).toBe(true);

    await login(page, "admin");
    await toggleClinic(page, "Desactivar");

    expect(await canSignIn("doctor-b@e2e.test")).toBe(false);
    expect(await canSignIn("admin-b@e2e.test")).toBe(false);
    expect(await canSignIn(inactiveEmail)).toBe(false);
    // Ni el administrador de plataforma ni otras clínicas quedan bloqueados.
    expect(await canSignIn("admin@e2e.test")).toBe(true);
    expect(await canSignIn("doctor@e2e.test")).toBe(true);
  });

  test("reactivar la clínica desbloquea solo a los usuarios activos", async ({ page }) => {
    await login(page, "admin");
    await toggleClinic(page, "Activar");

    expect(await canSignIn("doctor-b@e2e.test")).toBe(true);
    expect(await canSignIn("admin-b@e2e.test")).toBe(true);
    // Desactivado en Cuentas: sigue sin poder entrar.
    expect(await canSignIn(inactiveEmail)).toBe(false);
  });
});
