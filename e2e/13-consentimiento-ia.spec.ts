import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PASSWORD, testCedula, unique } from "./helpers";

// Consentimiento para IA (031), a nivel de base: todos los roles registran,
// la base pone quién y cuándo, no se edita ni se borra, y no cruza clínicas.
async function as(role: string): Promise<SupabaseClient> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: `${role}@e2e.test`, password: PASSWORD });
  return supabase;
}

let patientId = "";

test.beforeAll(async () => {
  const recepcion = await as("recepcion");
  const { data, error } = await recepcion
    .from("patients")
    .insert({ full_name: unique("Consentimiento E2E"), phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  expect(error).toBeNull();
  patientId = data!.id;
});

test("todos los roles registran; la base pone quién, rol y clínica", async () => {
  for (const role of ["admin", "recepcion", "doctor", "enfermeria"]) {
    const supabase = await as(role);
    const { data, error } = await supabase
      .from("ai_consents")
      .insert({ patient_id: patientId, scope: "dictado", granted: true, consent_version: "v1", recorded_role: "admin" })
      .select("recorded_role, recorded_by, clinic_id")
      .single();
    expect(error, role).toBeNull();
    expect(data!.recorded_role).toBe(role);
    expect(data!.recorded_by).not.toBeNull();
    expect(data!.clinic_id).not.toBeNull();
  }
});

test("nadie edita ni borra; un retiro es otra entrada", async () => {
  const admin = await as("admin");
  const { data: updated } = await admin.from("ai_consents").update({ granted: false }).eq("patient_id", patientId).select("id");
  expect(updated ?? []).toHaveLength(0);
  const { data: deleted } = await admin.from("ai_consents").delete().eq("patient_id", patientId).select("id");
  expect(deleted ?? []).toHaveLength(0);

  const { error } = await admin
    .from("ai_consents")
    .insert({ patient_id: patientId, scope: "dictado", granted: false, consent_version: "v1" });
  expect(error).toBeNull();
});

test("valida alcance y versión del texto", async () => {
  const supabase = await as("recepcion");
  const bad = [
    { patient_id: patientId, scope: "otro", granted: true, consent_version: "v1" },
    { patient_id: patientId, scope: "dictado", granted: true, consent_version: "v9" },
  ];
  for (const row of bad) {
    const { error } = await supabase.from("ai_consents").insert(row);
    expect(error, JSON.stringify(row)).not.toBeNull();
  }
});

test("otra clínica no ve ni registra consentimientos de este paciente", async () => {
  const otra = await as("recepcion-b");
  const { data } = await otra.from("ai_consents").select("id").eq("patient_id", patientId);
  expect(data ?? []).toHaveLength(0);
  const { error } = await otra
    .from("ai_consents")
    .insert({ patient_id: patientId, scope: "dictado", granted: true, consent_version: "v1" });
  expect(error).not.toBeNull();
});

test("no se registra en un paciente archivado", async () => {
  const recepcion = await as("recepcion");
  const { error: archiveError } = await recepcion
    .from("patients")
    .update({ archived_at: new Date().toISOString(), archived_reason: "Prueba E2E de consentimiento" })
    .eq("id", patientId);
  expect(archiveError).toBeNull();

  const { error } = await recepcion
    .from("ai_consents")
    .insert({ patient_id: patientId, scope: "ambiental", granted: true, consent_version: "v1" });
  expect(error).not.toBeNull();
});
