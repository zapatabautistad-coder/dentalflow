import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, open, testCedula, unique } from "./helpers";

// Pantalla de recetas: exequátur en Cuentas, receta con aviso de alergia, impresión y anulación.
test.describe.configure({ mode: "serial" });

const patientName = unique("Receta Pantalla");
let patientId = "";

test.beforeAll(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  const { data: doctor } = await supabase.from("profiles").select("id").eq("role", "doctor").single();
  const { data } = await supabase
    .from("patients")
    .insert({ full_name: patientName, phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  patientId = data!.id;
  await supabase.from("patient_medical_history").upsert({ patient_id: patientId, allergy_penicillin: true });
  // El doctor solo ve pacientes con cita suya (lunes 08:30, dentro del horario de 03).
  await supabase
    .from("appointments")
    .insert({ patient_id: patientId, doctor_id: doctor!.id, starts_at: "2027-01-04T08:30:00-04:00", duration_minutes: 15 });
});

test("el admin registra el exequátur del doctor en Cuentas", async ({ page }) => {
  await login(page, "admin");
  await open(page, "/accounts");
  const card = page.locator("li").filter({ hasText: "doctor@e2e.test" });
  await card.locator('input[name="exequatur"]').fill("EX-777");
  await card.getByRole("button", { name: "Guardar exequátur" }).click();
  await expect(card.getByText("Exequátur guardado.")).toBeVisible();
});

test("el doctor receta, ve el aviso de alergia e imprime con su exequátur", async ({ page }) => {
  await login(page, "doctor");
  await open(page, `/patients/${patientId}/recetas`);
  await page.locator('input[name="medication"]').first().fill("Amoxicilina 500 mg");
  await expect(page.getByText("Atención: el paciente tiene alergia registrada a")).toBeVisible();
  await page.locator('input[name="medication"]').first().fill("Clindamicina 300 mg");
  await page.locator('input[name="frequency"]').first().fill("Cada 8 horas");
  await page.getByRole("button", { name: "+ Agregar medicamento" }).click();
  await page.locator('input[name="medication"]').nth(1).fill("Acetaminofén 500 mg");
  await page.getByRole("button", { name: "Guardar receta" }).click();
  await expect(page.getByText("Receta guardada.")).toBeVisible();
  await expect(page.getByText("Clindamicina 300 mg").first()).toBeVisible();

  await page.getByRole("link", { name: "Imprimir" }).first().click();
  await expect(page.getByText("Exequátur EX-777")).toBeVisible();
  await expect(page.getByText("Acetaminofén 500 mg")).toBeVisible();
});

test("el doctor anula su receta con motivo", async ({ page }) => {
  await login(page, "doctor");
  await open(page, `/patients/${patientId}/recetas`);
  await page.getByText("Anular receta").first().click();
  await page.locator('input[name="void_reason"]').first().fill("Medicamento equivocado");
  await page.getByRole("button", { name: "Confirmar anulación" }).first().click();
  await expect(page.getByText("Motivo de anulación:").first()).toBeVisible();
});

test("recepción ve la receta anulada sin poder recetar", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, `/patients/${patientId}/recetas`);
  await expect(page.getByText("Clindamicina 300 mg").first()).toBeVisible();
  await expect(page.getByText("Anulada").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar receta" })).toHaveCount(0);
});
