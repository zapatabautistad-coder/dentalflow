import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, open, testCedula, unique } from "./helpers";

// Pantalla del consentimiento para IA (031) en la ficha del paciente.
test("recepción registra que el paciente acepta el dictado y luego lo retira", async ({ page }) => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  const { data: patient, error } = await supabase
    .from("patients")
    .insert({ full_name: unique("Consentimiento pantalla E2E"), phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  expect(error).toBeNull();

  await login(page, "recepcion");
  await open(page, `/patients/${patient!.id}`);

  const section = page.locator("section", { has: page.getByRole("heading", { name: "Consentimiento para IA" }) });
  const dictado = section.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: "Dictado del doctor" }) });
  await expect(dictado.getByText("Sin registrar")).toBeVisible();

  await dictado.locator('input[name="note"]').fill("Firmó el formulario en papel");
  await dictado.getByRole("button", { name: "El paciente acepta" }).click();
  await expect(dictado.getByText("Decisión registrada.")).toBeVisible();
  await expect(dictado.getByText("Aceptado", { exact: true })).toBeVisible();
  await expect(dictado.getByText("Firmó el formulario en papel", { exact: true })).toBeVisible();

  await dictado.getByRole("button", { name: "El paciente no acepta o lo retira" }).click();
  await expect(dictado.getByText("Rechazado o retirado")).toBeVisible();

  // La grabación de la consulta es otro permiso y sigue sin registrar.
  const ambiental = section.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: "Grabación de la consulta" }) });
  await expect(ambiental.getByText("Sin registrar")).toBeVisible();
});
