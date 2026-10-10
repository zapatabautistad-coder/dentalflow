import { expect, type Page } from "@playwright/test";
import { validateCedula } from "../src/lib/cedula";
import { readMfaSecret, totpCode } from "./mfa";

export type E2ERole = "admin" | "recepcion" | "doctor" | "enfermeria";

// Usuarios creados por e2e/setup-local.sh en la base local.
export const PASSWORD = "Prueba-E2e-2026!";

export async function login(page: Page, role: E2ERole | `${E2ERole}-b`) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(`${role}@e2e.test`);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/(panel|login\/verificar)/);

  // Admin y doctor tienen la app autenticadora activa: segundo paso con el código.
  if (page.url().includes("/login/verificar")) {
    const secret = readMfaSecret(role);
    if (!secret) throw new Error(`Sin secreto TOTP para ${role}: revisa e2e/global-setup.ts`);
    await page.locator('input[autocomplete="one-time-code"]').fill(totpCode(secret));
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page).toHaveURL(/\/panel/);
  }
}

// Primer ingreso de un admin o doctor sin app autenticadora: la app lo manda a
// /seguridad; se activa como lo haría una persona (lee el secreto y escribe el código).
export async function enrollMfaFromSecurityPage(page: Page) {
  await expect(page).toHaveURL(/\/seguridad/);
  await page.getByRole("button", { name: "Activar app autenticadora" }).click();
  const secret = (await page.locator("code").first().textContent())?.trim();
  if (!secret) throw new Error("No apareció el código secreto de la app autenticadora");
  await page.locator('input[autocomplete="one-time-code"]').fill(totpCode(secret));
  await page.getByRole("button", { name: "Verificar y activar" }).click();
  await expect(page.getByText("Verificación en dos pasos activa")).toBeVisible();
}

// Texto único por corrida para no chocar con datos de corridas anteriores.
export function unique(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}`;
}

// Próximo lunes (fecha local de Santo Domingo, YYYY-MM-DD).
export function nextMondayKey(): string {
  const local = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const delta = ((8 - local.getUTCDay()) % 7) || 7;
  local.setUTCDate(local.getUTCDate() + delta);
  return local.toISOString().slice(0, 10);
}

// Cédula ficticia con dígito verificador válido (solo para la base local).
export function testCedula(): string {
  for (;;) {
    const base = "999" + String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
    for (let check = 0; check <= 9; check++) {
      const candidate = base + check;
      if (validateCedula(candidate)) return candidate;
    }
  }
}

// Abre una página y espera a que React termine de cargar (hidratación).
// Si se escribe antes, un campo no controlado puede perder lo escrito.
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
