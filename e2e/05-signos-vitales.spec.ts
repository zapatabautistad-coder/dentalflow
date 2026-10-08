import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PASSWORD, testCedula, unique } from "./helpers";

// Signos vitales (026), a nivel de base: quién registra, inmutabilidad y validaciones.
async function as(role: string): Promise<SupabaseClient> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await supabase.auth.signInWithPassword({ email: `${role}@e2e.test`, password: PASSWORD });
  return supabase;
}

let patientId = "";
let otherAppointmentId = "";

test.beforeAll(async () => {
  const recepcion = await as("recepcion");
  const { data: doctor } = await recepcion.from("profiles").select("id").eq("role", "doctor").single();
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const { data } = await recepcion
      .from("patients")
      .insert({ full_name: unique(`Vitales E2E ${i}`), phone: "8095551234", document_id: testCedula() })
      .select("id")
      .single();
    ids.push(data!.id);
  }
  patientId = ids[0];
  // Lunes desde las 09:00, una cita cada 15 min: dentro del horario que carga
  // 03-recepcion-horarios (lunes 08:00–12:00) y sin solaparse (la base lo impide, 028).
  const { data: appts, error } = await recepcion
    .from("appointments")
    .insert(
      ids.map((id, i) => ({
        patient_id: id,
        doctor_id: doctor!.id,
        starts_at: new Date(Date.parse("2027-01-04T09:00:00-04:00") + i * 15 * 60_000).toISOString(),
        duration_minutes: 15,
      }))
    )
    .select("id, patient_id");
  expect(error).toBeNull();
  otherAppointmentId = appts!.find((a) => a.patient_id === ids[1])!.id;
});

test("asistente y doctor registran; la base pone autor y rol", async () => {
  for (const role of ["enfermeria", "doctor"]) {
    const supabase = await as(role);
    const { data, error } = await supabase
      .from("vital_signs")
      .insert({ patient_id: patientId, systolic: 150, diastolic: 95, heart_rate: 88, author_role: "admin" })
      .select("author_role")
      .single();
    expect(error).toBeNull();
    expect(data!.author_role).toBe(role);
  }
});

test("recepción no registra; nadie edita ni borra", async () => {
  const recepcion = await as("recepcion");
  const { error } = await recepcion.from("vital_signs").insert({ patient_id: patientId, heart_rate: 80 });
  expect(error).not.toBeNull();

  const doctor = await as("doctor");
  const { data: updated } = await doctor.from("vital_signs").update({ systolic: 120 }).eq("patient_id", patientId).select("id");
  expect(updated ?? []).toHaveLength(0);
  const { data: deleted } = await doctor.from("vital_signs").delete().eq("patient_id", patientId).select("id");
  expect(deleted ?? []).toHaveLength(0);
});

test("valida presión completa, rangos y cita del mismo paciente", async () => {
  const supabase = await as("enfermeria");
  const bad: Record<string, string | number>[] = [
    { patient_id: patientId, systolic: 140 },
    { patient_id: patientId, systolic: 80, diastolic: 90 },
    { patient_id: patientId, heart_rate: 500 },
    { patient_id: patientId },
    { patient_id: patientId, heart_rate: 80, appointment_id: otherAppointmentId },
  ];
  for (const row of bad) {
    const { error } = await supabase.from("vital_signs").insert(row);
    expect(error, JSON.stringify(row)).not.toBeNull();
  }
});
