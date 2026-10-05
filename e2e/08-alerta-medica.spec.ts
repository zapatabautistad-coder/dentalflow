import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD, login, open, testCedula, unique } from "./helpers";

// Chip de alerta médica en Pacientes: aparece con antecedentes de riesgo, no sin ellos.
const withAlert = unique("Alerta E2E");
const withoutAlert = unique("Sano E2E");

test.beforeAll(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: "recepcion@e2e.test", password: PASSWORD });
  for (const name of [withAlert, withoutAlert]) {
    const { data } = await supabase
      .from("patients")
      .insert({ full_name: name, phone: "8095551234", document_id: testCedula() })
      .select("id")
      .single();
    if (name === withAlert) {
      await supabase
        .from("patient_medical_history")
        .upsert({ patient_id: data!.id, allergy_penicillin: true, takes_anticoagulants: true });
    }
  }
});

test("la lista de pacientes marca solo a quien tiene antecedentes de riesgo", async ({ page }) => {
  await login(page, "recepcion");
  await open(page, "/patients");
  const chip = (name: string) =>
    page.locator("tr, li").filter({ hasText: name }).getByRole("button", { name: /^Alerta médica/ });
  await expect(chip(withAlert).first()).toBeVisible();
  await expect(chip(withAlert).first()).toHaveAttribute("aria-label", /penicilina.*anticoagulantes/);
  await expect(chip(withoutAlert)).toHaveCount(0);
});
