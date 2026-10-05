import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, open, testCedula, unique } from "./helpers";

// Pantalla de signos vitales en la ficha: registro, alerta, aviso por antecedentes y permisos.
let patientId = "";

test.beforeAll(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  const { data } = await supabase
    .from("patients")
    .insert({ full_name: unique("Vitales Pantalla"), phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  patientId = data!.id;
  await supabase.from("patient_medical_history").upsert({ patient_id: patientId, has_hypertension: true });
});

test("asistente registra una toma y ve la alerta de presión", async ({ page }) => {
  await login(page, "enfermeria");
  await open(page, `/patients/${patientId}`);
  await expect(page.getByText("Se recomienda tomar signos vitales:")).toBeVisible();
  await page.locator('input[name="systolic"]').first().fill("150");
  await page.locator('input[name="diastolic"]').first().fill("95");
  await page.locator('input[name="heart_rate"]').first().fill("88");
  await page.getByRole("button", { name: "Guardar signos vitales" }).click();
  await expect(page.getByText("150/95").first()).toBeVisible();
  await expect(page.getByText("Hipertensión etapa 2").first()).toBeVisible();
});

test("recepción ve la toma pero no puede registrar", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, `/patients/${patientId}`);
  await expect(page.getByText("150/95").first()).toBeVisible();
  await expect(page.locator('input[name="systolic"]')).toHaveCount(0);
});
