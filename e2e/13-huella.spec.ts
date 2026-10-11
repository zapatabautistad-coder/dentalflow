import { expect, test, type Page } from "@playwright/test";
import { login, PASSWORD } from "./helpers";

async function enableVirtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
}

async function addFingerprint(page: Page, name: string) {
  await page.goto("/seguridad");
  await page.getByLabel("Nombre de este dispositivo").fill(name);
  await page.getByRole("button", { name: "Agregar huella de este dispositivo" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("admin puede agregar una huella y usarla para verificar el inicio", async ({ page }) => {
  await login(page, "admin");
  await enableVirtualAuthenticator(page);
  await addFingerprint(page, "Laptop E2E");
  await logout(page);

  await page.locator('input[name="email"]').fill("admin@e2e.test");
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/login\/verificar/);
  await page.getByRole("button", { name: "Usar huella" }).click();
  await expect(page).toHaveURL(/\/panel/);
});

test("al desactivar una cuenta se eliminan sus factores y al reactivarla debe configurar MFA", async ({
  browser,
}) => {
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  await login(userPage, "doctor");
  await enableVirtualAuthenticator(userPage);
  await addFingerprint(userPage, "Laptop doctor E2E");
  await logout(userPage);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, "admin");
  await adminPage.goto("/accounts");
  const doctorRow = adminPage.locator("li").filter({ hasText: "doctor@e2e.test" });
  await doctorRow.getByText("Desactivar cuenta").click();
  await doctorRow.locator('textarea[name="deactivated_reason"]').fill("Prueba de desactivación");
  await doctorRow.getByRole("button", { name: "Confirmar desactivación" }).click();
  await expect(doctorRow.getByText("Desactivada")).toBeVisible();

  await userContext.close();
  await adminPage.locator("li").filter({ hasText: "doctor@e2e.test" }).getByRole("button", { name: "Reactivar cuenta" }).click();
  await expect(adminPage.locator("li").filter({ hasText: "doctor@e2e.test" }).getByText("Activa")).toBeVisible();

  const reactivatedContext = await browser.newContext();
  const reactivatedPage = await reactivatedContext.newPage();
  await reactivatedPage.goto("/login");
  await reactivatedPage.locator('input[name="email"]').fill("doctor@e2e.test");
  await reactivatedPage.locator('input[name="password"]').fill(PASSWORD);
  await reactivatedPage.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(reactivatedPage).toHaveURL(/\/seguridad/);

  await reactivatedContext.close();
  await adminContext.close();
});
