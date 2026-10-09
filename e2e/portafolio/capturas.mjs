// Capturas de portafolio contra la app local (datos de demostración).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3100";
const OUT = process.argv[2];
const ids = JSON.parse(process.env.DEMO_IDS);
const lang = process.env.DEMO_LANG || "en";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function session(role, viewport, scale = 2) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: lang === "en" ? "en-US" : "es-DO", timezoneId: "America/Santo_Domingo" });
  await ctx.addInitScript((l) => { try { localStorage.setItem("dentalflow-language", l); } catch {} }, lang);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.locator('input[name="email"]').fill(`${role}@e2e.test`);
  await page.locator('input[name="password"]').fill("Prueba-E2e-2026!");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/panel/);
  return { ctx, page };
}

async function shot(page, path, name, full = false) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("ok", name);
}

const desk = { width: 1440, height: 900 };
const p = ids.maria;

{
  const { ctx, page } = await session("doctor", desk);
  await shot(page, "/panel", "01-panel");
  await shot(page, `/patients/${p}`, "02-ficha-paciente");
  await shot(page, `/patients/${p}/odontograma`, "03-odontograma");
  await shot(page, `/patients/${p}/plan-tratamiento`, "04-plan-tratamiento");
  await shot(page, "/waiting-room", "05-sala-de-espera");
  await shot(page, `/patients/${ids.jose}/recetas/${ids.receta}`, "07-receta");
  await ctx.close();
}
{
  const { ctx, page } = await session("recepcion", desk);
  await shot(page, `/patients/${p}/facturacion`, "06-facturacion");
  await shot(page, "/appointments", "08-citas");
  await shot(page, "/horarios", "09-horarios");
  await ctx.close();
}
{
  const { ctx, page } = await session("doctor", { width: 390, height: 844 }, 3);
  await shot(page, "/panel", "10-celular-panel");
  await shot(page, "/waiting-room", "11-celular-sala");
  await shot(page, `/patients/${p}`, "12-celular-ficha");
  await ctx.close();
}
await browser.close();
