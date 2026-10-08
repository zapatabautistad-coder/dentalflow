import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PASSWORD, testCedula, unique } from "./helpers";

// Aislamiento entre clínicas (migración 029). Solo contra la base local: la clínica B y sus
// usuarios (*-b@e2e.test) los crea e2e/setup-local.sh. Cuenta con una base recién reiniciada.
test.describe.configure({ mode: "serial" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(URL, ANON);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  expect(error).toBeNull();
  return client;
}

async function newPatient(client: SupabaseClient, prefix: string) {
  const { data, error } = await client
    .from("patients")
    .insert({ full_name: unique(prefix), phone: "8095551234", document_id: testCedula() })
    .select("id, record_number, clinic_id")
    .single();
  expect(error).toBeNull();
  return data!;
}

async function newPayment(client: SupabaseClient, patientId: string) {
  const { error: chargeError } = await client
    .from("billing_charges")
    .insert({ patient_id: patientId, description: "Consulta aislamiento", amount: 1000 });
  expect(chargeError).toBeNull();
  const { data, error } = await client
    .from("billing_payments")
    .insert({ patient_id: patientId, amount: 1000, method: "efectivo" })
    .select("receipt_number")
    .single();
  expect(error).toBeNull();
  return data!.receipt_number as number;
}

let recepA: SupabaseClient;
let recepB: SupabaseClient;
let adminA: SupabaseClient;
let adminB: SupabaseClient;
let patientA: { id: string; record_number: number; clinic_id: string };
let patientB: { id: string; record_number: number; clinic_id: string };

test.beforeAll(async () => {
  [recepA, recepB, adminA, adminB] = await Promise.all([
    signIn("recepcion@e2e.test"),
    signIn("recepcion-b@e2e.test"),
    signIn("admin@e2e.test"),
    signIn("admin-b@e2e.test"),
  ]);
});

test("la clínica B no ve pacientes, perfiles ni auditoría de A", async () => {
  patientA = await newPatient(recepA, "Aislamiento A");

  const { data: clinicA } = await adminA.rpc("get_my_clinic");
  const { data: clinicB } = await adminB.rpc("get_my_clinic");
  expect(clinicA).toBeTruthy();
  expect(clinicB).toBeTruthy();
  expect(clinicB).not.toBe(clinicA);

  const { data: seenPatients, error: patientsError } = await recepB.from("patients").select("id").eq("id", patientA.id);
  expect(patientsError).toBeNull();
  expect(seenPatients).toHaveLength(0);

  const { data: profilesB } = await adminB.from("profiles").select("id, clinic_id");
  expect(profilesB!.length).toBeGreaterThan(0);
  expect(profilesB!.every((p) => p.clinic_id === clinicB)).toBe(true);
  const { data: profilesA } = await adminA.from("profiles").select("id, clinic_id");
  expect(profilesA!.every((p) => p.clinic_id === clinicA)).toBe(true);

  // A sí ve la auditoría del paciente; B no ve nada de ella.
  const { data: auditA } = await adminA.from("audit_log").select("id").eq("record_id", patientA.id);
  expect(auditA!.length).toBeGreaterThan(0);
  const { data: auditB, error: auditError } = await adminB.from("audit_log").select("id, clinic_id");
  expect(auditError).toBeNull();
  expect(auditB!.every((row) => row.clinic_id === clinicB)).toBe(true);
  expect(auditB!.some((row) => row.id === auditA![0].id)).toBe(false);
});

test("expedientes y recibos de cada clínica empiezan en 1", async () => {
  patientB = await newPatient(recepB, "Aislamiento B");
  expect(patientB.record_number).toBe(1);
  const secondB = await newPatient(recepB, "Aislamiento B2");
  expect(secondB.record_number).toBe(2);

  // El consecutivo de A sigue por su cuenta, sin saltos por lo que haga B.
  const nextA = await newPatient(recepA, "Aislamiento A2");
  expect(nextA.record_number).toBe(patientA.record_number + 1);

  const firstReceiptB = await newPayment(recepB, patientB.id);
  expect(firstReceiptB).toBe(1);
  expect(await newPayment(recepB, patientB.id)).toBe(2);

  const receiptA = await newPayment(recepA, patientA.id);
  expect(await newPayment(recepA, patientA.id)).toBe(receiptA + 1);
});

test("una cita de B con un doctor de A es rechazada", async () => {
  const service = createClient(URL, SERVICE);
  const { data: doctorA } = await service.from("profiles").select("id").eq("role", "doctor").eq("full_name", "E2E doctor").single();
  expect(doctorA).toBeTruthy();

  const { error } = await recepB.from("appointments").insert({
    patient_id: patientB.id,
    doctor_id: doctorA!.id,
    starts_at: "2031-03-03T08:00:00-04:00",
    duration_minutes: 30,
  });
  expect(error).not.toBeNull();

  const { data: created } = await recepB.from("appointments").select("id").eq("patient_id", patientB.id);
  expect(created).toHaveLength(0);
});

test("un usuario nuevo sin clínica falla cuando hay dos clínicas", async () => {
  const service = createClient(URL, SERVICE);
  const email = `sin-clinica-${Date.now().toString(36)}@e2e.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  expect(error).not.toBeNull();
  expect(data.user).toBeNull();

  const { data: profiles } = await service.from("profiles").select("id, full_name").eq("full_name", "").limit(1);
  expect(profiles ?? []).toHaveLength(0);
});

test("nadie puede cambiar su clinic_id", async () => {
  const { data: clinicA } = await adminA.rpc("get_my_clinic");
  const { data: clinicB } = await adminB.rpc("get_my_clinic");

  // Mover un paciente de B a A.
  const { data: moved } = await recepB.from("patients").update({ clinic_id: clinicA }).eq("id", patientB.id).select("id");
  expect(moved ?? []).toHaveLength(0);
  const { data: stillB } = await recepB.from("patients").select("clinic_id").eq("id", patientB.id).single();
  expect(stillB!.clinic_id).toBe(clinicB);

  // Un admin mueve su propio perfil y el de un compañero a otra clínica.
  const { data: me } = await adminB.auth.getUser();
  const { data: peers } = await adminB.from("profiles").select("id").neq("id", me.user!.id).limit(1);
  for (const id of [me.user!.id, peers![0].id]) {
    const { data: changed } = await adminB.from("profiles").update({ clinic_id: clinicA }).eq("id", id).select("id");
    expect(changed ?? []).toHaveLength(0);
  }
  const { data: profiles } = await adminB.from("profiles").select("clinic_id");
  expect(profiles!.every((p) => p.clinic_id === clinicB)).toBe(true);

  // La clínica de A tampoco se puede mover.
  const { data: movedA } = await adminA.from("clinics").update({ id: clinicB }).eq("id", clinicA).select("id");
  expect(movedA ?? []).toHaveLength(0);
});
