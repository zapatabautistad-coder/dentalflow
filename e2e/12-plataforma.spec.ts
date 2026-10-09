import { expect, test } from "@playwright/test";
import { login, open, PASSWORD } from "./helpers";

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
