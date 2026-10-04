import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, nextMondayKey, open, testCedula, unique } from "./helpers";

// Flujo de recepción: paciente nuevo → cita → horario del doctor (migración 022).
test.describe.configure({ mode: "serial" });

const patientName = unique("Paciente E2E");
const monday = nextMondayKey();

async function bookAppointment(page: import("@playwright/test").Page, time: string, duration = "30") {
  await open(page, "/appointments/new");
  await page.getByPlaceholder("Buscar paciente por nombre, cédula o teléfono…").fill(patientName);
  await page.getByRole("button", { name: patientName }).click();
  await page.locator('select[name="doctor_id"]').selectOption({ label: "E2E doctor" });
  await page.locator('input[name="date"]').fill(monday);
  await page.locator('input[name="time"]').fill(time);
  await page.locator('select[name="duration_minutes"]').selectOption(duration);
  await page.getByRole("button", { name: "Guardar cita" }).click();
}

test("recepción registra un paciente nuevo", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, "/patients/new");
  await page.locator('input[name="full_name"]').fill(patientName);
  await page.locator('input[name="document_id"]').fill(testCedula());
  await page.locator('input[name="phone"]').fill("809-555-1234");
  await page.getByRole("button", { name: "Guardar paciente" }).click();
  await expect(page).toHaveURL(/\/patients\/[0-9a-f-]{36}$/);
  await expect(page.getByText(patientName).first()).toBeVisible();
});

test("recepción agenda una cita sin horario configurado", async ({ page }) => {
  await login(page, "recepcion");
  await bookAppointment(page, "19:00");
  await expect(page).toHaveURL(new RegExp(`/appointments\\?date=${monday}`));
  await expect(page.getByText(patientName).first()).toBeVisible();
});

test("con horario, la base rechaza citas fuera de turno", async ({ page }) => {
  // Recepción carga el horario del doctor: lunes 08:00–12:00.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  const { data: doctor } = await supabase.from("profiles").select("id").eq("role", "doctor").single();
  const { error } = await supabase
    .from("doctor_schedules")
    .insert({ doctor_id: doctor!.id, weekday: 1, start_time: "08:00", end_time: "12:00" });
  expect(error).toBeNull();

  await login(page, "recepcion");
  await bookAppointment(page, "09:00");
  await expect(page).toHaveURL(new RegExp(`/appointments\\?date=${monday}`));

  await bookAppointment(page, "11:45");
  await expect(page.getByText("La cita queda fuera del horario del doctor.")).toBeVisible();

  // Un día libre bloquea también las horas dentro del turno.
  const { error: offError } = await supabase
    .from("doctor_time_off")
    .insert({ doctor_id: doctor!.id, starts_on: monday, ends_on: monday, reason: "Congreso" });
  expect(offError).toBeNull();
  await bookAppointment(page, "10:00");
  await expect(page.getByText("El doctor tiene ese día libre.")).toBeVisible();
});

test("el doctor no puede cargar horario de otro doctor ni borrar citas", async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "doctor@e2e.test", password: PASSWORD });
  const { data: admin } = await supabase.from("profiles").select("id").eq("role", "admin").single();
  const { error } = await supabase
    .from("doctor_schedules")
    .insert({ doctor_id: admin!.id, weekday: 2, start_time: "08:00", end_time: "12:00" });
  expect(error).not.toBeNull();

  const { data: deleted } = await supabase.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
  expect(deleted ?? []).toHaveLength(0);
});
