import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, nextMondayKey, open, testCedula, unique } from "./helpers";

// Flujo clínico: odontograma y plan (doctor), cobro (recepción), límites de la asistente.
test.describe.configure({ mode: "serial" });

let patientId = "";

test.beforeAll(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  const { data, error } = await supabase
    .from("patients")
    .insert({ full_name: unique("Clínico E2E"), phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  expect(error).toBeNull();
  patientId = data!.id;

  // El doctor solo ve pacientes con cita o turno suyo: se agenda una (lunes de la semana
  // siguiente a las 08:00, dentro del horario que carga 03-recepcion-horarios).
  const { data: doctor } = await supabase.from("profiles").select("id").eq("role", "doctor").single();
  const [y, m, d] = nextMondayKey().split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10);
  const { error: apptError } = await supabase
    .from("appointments")
    .insert({ patient_id: patientId, doctor_id: doctor!.id, starts_at: `${day}T08:00:00-04:00`, duration_minutes: 30 });
  expect(apptError).toBeNull();
});

test("doctor registra un hallazgo en el odontograma", async ({ page }) => {
  await login(page, "doctor");
  await open(page, `/patients/${patientId}/odontograma`);
  await page.getByRole("button", { name: /^Diente 46/ }).click();
  await page.locator('input[name="surfaces"][value="O"]').check();
  await page.getByRole("button", { name: "Registrar hallazgo" }).click();
  await expect(page.getByRole("button", { name: /^Diente 46: .*[Cc]aries/ })).toBeVisible();
});

test("doctor agrega un procedimiento al plan", async ({ page }) => {
  await login(page, "doctor");
  await open(page, `/patients/${patientId}/plan-tratamiento`);
  await page.locator('input[name="procedure"]').fill("Resina oclusal");
  await page.locator('input[name="estimated_cost"]').fill("2500");
  await page.getByRole("button", { name: "Agregar al plan" }).click();
  await expect(page.getByText("Resina oclusal").first()).toBeVisible();
});

test("recepción cobra y registra el pago", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, `/patients/${patientId}/facturacion`);
  await page.locator('input[name="description"]').fill("Consulta E2E");
  await page.locator('form:has(input[name="description"]) input[name="amount"]').fill("1500");
  await page.getByRole("button", { name: "Guardar cargo" }).click();
  await expect(page.getByText("Consulta E2E").first()).toBeVisible();
  await page.locator('form:has(select[name="method"]) input[name="amount"]').fill("1500");
  await page.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.locator("text=/Recibo/i").first()).toBeVisible();
});

test("asistente dental: sin facturación ni odontograma editable", async ({ page }) => {
  await login(page, "enfermeria");
  await open(page, `/patients/${patientId}/facturacion`);
  await expect(page.getByRole("button", { name: "Guardar cargo" })).toHaveCount(0);
  await open(page, `/patients/${patientId}/odontograma`);
  await expect(page.getByRole("button", { name: "Registrar hallazgo" })).toHaveCount(0);
});

test("doctor no puede cobrar (solo la base, sin pantalla)", async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "doctor@e2e.test", password: PASSWORD });
  const { error } = await supabase.from("billing_charges").insert({ patient_id: patientId, description: "No permitido", amount: 100 });
  expect(error).not.toBeNull();
});

test("asistente dental no ve cobros ni a través de la auditoría (025)", async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "enfermeria@e2e.test", password: PASSWORD });
  const { data } = await supabase
    .from("audit_log")
    .select("id")
    .eq("patient_id", patientId)
    .in("table_name", ["billing_charges", "billing_payments"]);
  expect(data ?? []).toHaveLength(0);
});
