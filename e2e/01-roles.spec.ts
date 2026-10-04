import { expect, test } from "@playwright/test";
import { login, type E2ERole } from "./helpers";

const MENU: Record<E2ERole, { visible: string[]; hidden: string[] }> = {
  admin: { visible: ["Pacientes", "Citas", "Sala de espera", "Análisis", "Cuentas"], hidden: [] },
  recepcion: { visible: ["Pacientes", "Citas", "Sala de espera"], hidden: ["Análisis", "Cuentas"] },
  doctor: { visible: ["Pacientes", "Citas", "Sala de espera", "Análisis"], hidden: ["Cuentas"] },
  enfermeria: { visible: ["Pacientes", "Citas", "Sala de espera"], hidden: ["Análisis", "Cuentas"] },
};

for (const role of Object.keys(MENU) as E2ERole[]) {
  test(`${role}: entra y ve solo su menú`, async ({ page }) => {
    await login(page, role);
    const nav = page.locator("nav").first();
    for (const item of MENU[role].visible) {
      await expect(nav.getByRole("link", { name: item, exact: false }).first()).toBeVisible();
    }
    for (const item of MENU[role].hidden) {
      await expect(nav.getByRole("link", { name: item, exact: false })).toHaveCount(0);
    }
  });
}

test("sin sesión, las páginas internas mandan al login", async ({ page }) => {
  await page.goto("/patients");
  await expect(page).toHaveURL(/\/login/);
});

test("recepción no entra a Cuentas", async ({ page }) => {
  await login(page, "recepcion");
  await page.goto("/accounts");
  await expect(page).not.toHaveURL(/\/accounts$/);
});
