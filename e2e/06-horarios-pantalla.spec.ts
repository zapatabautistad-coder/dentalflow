import { expect, test } from "@playwright/test";
import { login, open } from "./helpers";

// Pantalla /horarios: agregar bloque, cruce rechazado y mensajes solo por clave conocida.
test("recepción agrega un bloque y la base rechaza el cruce", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, "/horarios");
  const form = page.locator("form:has(select[name=weekday])");

  await form.locator("select[name=weekday]").selectOption("3");
  await form.locator("input[name=start_time]").fill("14:00");
  await form.locator("input[name=end_time]").fill("18:00");
  await Promise.all([page.waitForURL(/doctor=/), form.getByRole("button", { name: "Agregar bloque" }).click()]);
  await expect(page.getByText("Miércoles · 14:00–18:00")).toBeVisible();

  await form.locator("select[name=weekday]").selectOption("3");
  await form.locator("input[name=start_time]").fill("17:00");
  await form.locator("input[name=end_time]").fill("19:00");
  await Promise.all([page.waitForURL(/errorKey=schedule\.error\.overlap/), form.getByRole("button", { name: "Agregar bloque" }).click()]);
  await expect(page.getByRole("alert").filter({ hasText: "Ese bloque se cruza con otro horario del mismo día." })).toBeVisible();
});

test("un texto libre en la URL no se muestra como aviso", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, `/horarios?error=${encodeURIComponent("Su sesión expiró. Llame al 809-000-0000")}&errorKey=inventada`);
  await expect(page.getByText("Su sesión expiró")).toHaveCount(0);
  await expect(page.getByText("inventada")).toHaveCount(0);
});
