import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PASSWORD, testCedula, unique } from "./helpers";

// Recetas (027), a nivel de base: exequátur obligatorio, creación atómica, solo anular.
test.describe.configure({ mode: "serial" });

async function as(role: string): Promise<SupabaseClient> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: `${role}@e2e.test`, password: PASSWORD });
  return supabase;
}

const ITEMS = [
  { medication: "Amoxicilina 500 mg", dose: "1 cápsula", frequency: "cada 8 horas", duration: "7 días", quantity: "21" },
  { medication: "Ibuprofeno 400 mg", frequency: "cada 8 horas si hay dolor", duration: "3 días" },
];

let patientId = "";
let doctorId = "";
let prescriptionId = "";

test.beforeAll(async () => {
  const recepcion = await as("recepcion");
  const { data: doctor } = await recepcion.from("profiles").select("id").eq("role", "doctor").single();
  doctorId = doctor!.id;
  const { data: patient } = await recepcion
    .from("patients")
    .insert({ full_name: unique("Receta E2E"), phone: "8095551234", document_id: testCedula() })
    .select("id")
    .single();
  patientId = patient!.id;
  // El doctor solo ve pacientes con cita suya (lunes 08:15, dentro del horario de 03).
  const { error } = await recepcion
    .from("appointments")
    .insert({ patient_id: patientId, doctor_id: doctorId, starts_at: "2027-01-04T08:15:00-04:00", duration_minutes: 15 });
  expect(error).toBeNull();
});

test("sin exequátur no se receta", async () => {
  const doctor = await as("doctor");
  const { error } = await doctor.rpc("create_prescription", { p_patient_id: patientId, p_items: ITEMS });
  expect(error?.message).toContain("exequátur");
});

test("el admin registra el exequátur; solo el admin", async () => {
  const doctor = await as("doctor");
  const { data: own } = await doctor.from("profiles").update({ exequatur: "999-99" }).eq("id", doctorId).select("id");
  expect(own ?? []).toHaveLength(0);
  const admin = await as("admin");
  const { error } = await admin.from("profiles").update({ exequatur: "12345-06" }).eq("id", doctorId);
  expect(error).toBeNull();
});

test("el doctor receta: medicamentos y exequátur quedan en la receta", async () => {
  const doctor = await as("doctor");
  const { data: id, error } = await doctor.rpc("create_prescription", {
    p_patient_id: patientId,
    p_items: ITEMS,
    p_indications: "Tomar con comida.",
  });
  expect(error).toBeNull();
  prescriptionId = id as string;
  const { data } = await doctor
    .from("prescriptions")
    .select("doctor_exequatur, doctor_name, prescription_items(position, medication)")
    .eq("id", prescriptionId)
    .single();
  expect(data!.doctor_exequatur).toBe("12345-06");
  expect(data!.doctor_name).toBe("E2E doctor");
  expect(data!.prescription_items).toHaveLength(2);
});

test("no se agregan medicamentos después ni receta la asistente", async () => {
  const doctor = await as("doctor");
  const { error: late } = await doctor
    .from("prescription_items")
    .insert({ prescription_id: prescriptionId, position: 3, medication: "Agregado tarde" });
  expect(late).not.toBeNull();

  const enfermeria = await as("enfermeria");
  const { error } = await enfermeria.rpc("create_prescription", { p_patient_id: patientId, p_items: ITEMS });
  expect(error).not.toBeNull();
});

test("no se edita; se anula una vez con motivo; todos la leen", async () => {
  const doctor = await as("doctor");
  const { error: edit } = await doctor.from("prescriptions").update({ indications: "cambiada" }).eq("id", prescriptionId);
  expect(edit).not.toBeNull();
  const { error: voidError } = await doctor
    .from("prescriptions")
    .update({ void_reason: "Dosis equivocada" })
    .eq("id", prescriptionId);
  expect(voidError).toBeNull();
  const { error: again } = await doctor.from("prescriptions").update({ void_reason: "Otra vez" }).eq("id", prescriptionId);
  expect(again).not.toBeNull();

  const recepcion = await as("recepcion");
  const { data } = await recepcion.from("prescriptions").select("voided_at, prescription_items(id)").eq("id", prescriptionId).single();
  expect(data!.voided_at).not.toBeNull();
  expect(data!.prescription_items).toHaveLength(2);
});
