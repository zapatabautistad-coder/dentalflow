import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, open, testCedula, unique } from "./helpers";

// Sala de espera: llegada desde Citas (recepción) y "Llamar siguiente" (doctor).
// Corre antes de 03 porque la cita de hoy debe crearse sin horario cargado.
test.describe.configure({ mode: "serial" });

const patientName = unique("Sala E2E");

test.beforeAll(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  const { data: patient } = await supabase
    .from("patients")
    .insert({ full_name: patientName, phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  const { data: doctor } = await supabase.from("profiles").select("id").eq("role", "doctor").single();
  const today = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { error } = await supabase
    .from("appointments")
    .insert({ patient_id: patient!.id, doctor_id: doctor!.id, starts_at: `${today}T23:00:00-04:00`, duration_minutes: 30 });
  expect(error).toBeNull();
});

test("recepción marca la llegada y el paciente entra a la sala", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, "/appointments");
  const row = page.locator("li, article, div").filter({ hasText: patientName }).filter({ has: page.getByRole("button", { name: "Llegó" }) }).last();
  await row.getByRole("button", { name: "Llegó" }).click();
  await expect(page.locator("li, article, div").filter({ hasText: patientName }).getByRole("button", { name: "Llegó" })).toHaveCount(0);
  await open(page, "/waiting-room");
  await expect(page.getByText(patientName).first()).toBeVisible();
});

test("el doctor llama al siguiente", async ({ page }) => {
  await login(page, "doctor");
  await open(page, "/waiting-room");
  await page.getByRole("button", { name: "Llamar siguiente" }).click();
  await expect(page.getByRole("button", { name: "En atención" }).first()).toBeVisible();
});
