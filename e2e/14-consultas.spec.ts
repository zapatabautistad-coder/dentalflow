import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { login, open, testCedula, unique, signInApi } from "./helpers";

// Consultas en la ficha: la asistente abre, la nota se enlaza, el doctor cierra y recepción solo ve.
let patientId = "";
const reason = unique("Dolor molar");
const note = unique("Nota de consulta");

test.beforeAll(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await signInApi(supabase, "recepcion@e2e.test");
  const { data } = await supabase
    .from("patients")
    .insert({ full_name: unique("Consulta Pantalla"), phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  patientId = data!.id;
});

test.describe.configure({ mode: "serial" });

test("asistente abre la consulta y la nota queda enlazada", async ({ page }) => {
  await login(page, "enfermeria");
  await open(page, `/patients/${patientId}`);
  await expect(page.getByText("Este paciente no tiene consultas registradas.")).toBeVisible();
  await page.getByText("Abrir consulta", { exact: true }).first().click();
  await page.locator('textarea[name="reason"]').fill(reason);
  await page.getByRole("button", { name: "Abrir consulta" }).click();
  await expect(page.getByText(reason)).toBeVisible();
  await expect(page.getByText("Abierta", { exact: true })).toBeVisible();

  await page.locator('textarea[name="body"]').first().fill(note);
  await page.getByRole("button", { name: "Guardar y firmar" }).click();
  await expect(page.getByText(note).first()).toBeVisible();

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await signInApi(supabase, "enfermeria@e2e.test");
  const { data } = await supabase.from("clinical_entries").select("encounter_id").eq("patient_id", patientId).eq("body", note).single();
  expect(data?.encounter_id).not.toBeNull();
});

test("la asistente no ve el botón de cerrar; el doctor cierra y queda sin botones", async ({ page }) => {
  await login(page, "enfermeria");
  await open(page, `/patients/${patientId}`);
  await expect(page.getByText("Cerrar consulta")).toHaveCount(0);

  await page.context().clearCookies();
  await login(page, "doctor");
  await open(page, `/patients/${patientId}`);
  await page.getByText("Cerrar consulta", { exact: true }).click();
  await page.locator('textarea[name="closure_note"]').fill("Sin complicaciones");
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(page.getByText("Sin complicaciones")).toBeVisible();
  await expect(page.getByText("Cerrada", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Cerrar consulta")).toHaveCount(0);
});

test("recepción ve la consulta pero no puede abrirla", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, `/patients/${patientId}`);
  await expect(page.getByText(reason)).toBeVisible();
  await expect(page.getByText("Abrir consulta")).toHaveCount(0);
});
