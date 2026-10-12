import { expect, test } from "@playwright/test";
import { login, PASSWORD } from "./helpers";

// Va al final: deja al doctor de prueba sin app autenticadora.
test("al desactivar una cuenta se borran sus factores y al reactivarla debe configurar MFA", async ({
  browser,
}) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, "admin");
  await adminPage.goto("/accounts");
  const doctorRow = () => adminPage.locator("li").filter({ hasText: "doctor@e2e.test" });
  await doctorRow().getByText("Desactivar cuenta").click();
  await doctorRow().locator('textarea[name="deactivated_reason"]').fill("Prueba de desactivación");
  await doctorRow().getByRole("button", { name: "Confirmar desactivación" }).click();
  await expect(doctorRow().getByText("Desactivada", { exact: true })).toBeVisible();

  await doctorRow().getByRole("button", { name: "Reactivar cuenta" }).click();
  await expect(doctorRow().getByText("Activa", { exact: true })).toBeVisible();

  // El doctor tenía la app autenticadora: si no se hubiera borrado, iría a /login/verificar.
  const doctorContext = await browser.newContext();
  const doctorPage = await doctorContext.newPage();
  await doctorPage.goto("/login");
  await doctorPage.locator('input[name="email"]').fill("doctor@e2e.test");
  await doctorPage.locator('input[name="password"]').fill(PASSWORD);
  await doctorPage.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(doctorPage).toHaveURL(/\/seguridad/);

  await doctorContext.close();
  await adminContext.close();
});
