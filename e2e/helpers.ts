import { expect, type Page } from "@playwright/test";
import { validateCedula } from "../src/lib/cedula";

export type E2ERole = "admin" | "recepcion" | "doctor" | "enfermeria";

// Usuarios creados por e2e/setup-local.sh en la base local.
export const PASSWORD = "Prueba-E2e-2026!";

export async function login(page: Page, role: E2ERole) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(`${role}@e2e.test`);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/panel/);
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
