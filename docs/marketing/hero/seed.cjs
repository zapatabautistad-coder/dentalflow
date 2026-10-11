// Datos de DEMOSTRACIÓN solo para la base LOCAL (Docker). Nunca producción.
const { createClient } = require("@supabase/supabase-js");
const { createHmac } = require("node:crypto");
const fs = require("node:fs");
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) throw new Error("Solo base local");
const PASS = "Prueba-E2e-2026!";
function totp(secret, now = Date.now()) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) { const v = a.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, "0"); }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(ctr).digest(); const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}
function cedula() {
  for (;;) { const base = "402" + String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
    for (let d = 0; d <= 9; d++) { const s = base + d; let sum = 0;
      for (let i = 0; i < 10; i++) { let p = Number(s[i]) * (i % 2 ? 2 : 1); if (p > 9) p -= 9; sum += p; }
      if ((10 - (sum % 10)) % 10 === d) return s; } }
}
const check = (r, what) => { if (r.error) throw new Error(what + ": " + r.error.message); return r.data; };
async function main() {
  const svc = createClient(URL, SRV, { auth: { persistSession: false } });
  const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const secrets = {};
  for (const u of ["admin", "doctor"]) {
    const f = list.users.find((x) => x.email === `${u}@e2e.test`);
    for (const fa of f.factors ?? []) await svc.auth.admin.mfa.deleteFactor({ id: fa.id, userId: f.id });
    const c = createClient(URL, ANON, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email: `${u}@e2e.test`, password: PASS });
    const en = check(await c.auth.mfa.enroll({ factorType: "totp" }), "enroll");
    check(await c.auth.mfa.challengeAndVerify({ factorId: en.id, code: totp(en.totp.secret) }), "verify");
    secrets[u] = en.totp.secret;
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(secrets));
  async function as(u) {
    const c = createClient(URL, ANON, { auth: { persistSession: false } });
    check(await c.auth.signInWithPassword({ email: `${u}@e2e.test`, password: PASS }), "login " + u);
    if (secrets[u]) { const { data } = await c.auth.mfa.listFactors(); check(await c.auth.mfa.challengeAndVerify({ factorId: data.totp[0].id, code: totp(secrets[u]) }), "mfa"); }
    return c;
  }
  const admin = await as("admin"), recep = await as("recepcion"), doc = await as("doctor");
  const doctorId = check(await admin.from("profiles").select("id").eq("role", "doctor").single(), "doc").id;
  for (let wd = 0; wd <= 6; wd++) check(await admin.from("doctor_schedules").insert({ doctor_id: doctorId, weekday: wd, start_time: "07:00", end_time: "20:00" }), "horario");
  const people = [
    ["María Fernanda Rodríguez", "ars", "ARS Demo", "1985-03-14", "Paciente con hipertensión controlada."],
    ["José Miguel Peña", "privado", null, "1979-07-02", null],
    ["Carmen Altagracia Núñez", "ars", "ARS Demo", "1992-11-21", null],
    ["Luis Alberto Castillo", "ars", "ARS Demo", "1968-01-30", "Diabético tipo 2."],
    ["Ana Lucía Batista", "privado", null, "2001-05-09", null],
    ["Rafael Antonio Guzmán", "ars", "ARS Demo", "1974-09-17", null],
    ["Yesenia Marte Polanco", "ars", "ARS Demo", "1988-12-03", null],
    ["Pedro Julio Almonte", "privado", null, "1995-04-26", null],
    ["Rosa Elena Tavárez", "ars", "ARS Demo", "1960-08-11", null],
  ];
  const ids = [];
  for (const [full_name, insurance_type, insurance_provider, birth_date, notes] of people) {
    const row = { full_name, phone: "809555" + String(1000 + ids.length * 137).slice(0, 4), document_id: cedula(), birth_date, insurance_type, insurance_provider, notes };
    if (insurance_provider) row.affiliate_number = String(10000000 + ids.length * 7319);
    ids.push(check(await recep.from("patients").insert(row).select("id").single(), "paciente").id);
  }
  const today = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  const times = ["08:00", "08:45", "09:30", "10:15", "11:00", "14:00", "15:00", "16:00", "17:00"];
  const reasons = ["Limpieza y control", "Dolor en molar inferior", "Evaluación de ortodoncia", "Endodoncia (2.ª sesión)", "Colocación de corona", "Extracción de cordal", "Blanqueamiento", "Control post-operatorio", "Primera consulta"];
  const appts = [];
  for (let i = 0; i < ids.length; i++)
    appts.push(check(await recep.from("appointments").insert({ patient_id: ids[i], doctor_id: doctorId, starts_at: `${today}T${times[i]}:00-04:00`, duration_minutes: 45, reason: reasons[i], status: i < 4 ? "confirmada" : "programada" }).select("id").single(), "cita").id);
  // Citas de días siguientes.
  for (let d = 1; d <= 4; d++) {
    const day = new Date(Date.parse(today) + d * 86400e3).toISOString().slice(0, 10);
    for (let k = 0; k < 3; k++) check(await recep.from("appointments").insert({ patient_id: ids[(d + k * 2) % ids.length], doctor_id: doctorId, starts_at: `${day}T${["09:00","11:00","15:30"][k]}:00-04:00`, duration_minutes: 45, reason: reasons[(d + k) % reasons.length] }), "cita futura");
  }
  // Sala de espera: tres pacientes llegaron.
  for (let i = 0; i < 3; i++) check(await recep.from("queue").insert({ patient_id: ids[i], appointment_id: appts[i], doctor_id: doctorId }), "turno");
  const p = ids[0];
  const odo = [
    { tooth: 16, condition: "obturacion", surfaces: ["O", "M"] }, { tooth: 26, condition: "corona" },
    { tooth: 36, condition: "endodoncia" }, { tooth: 46, condition: "caries", surfaces: ["O"] },
    { tooth: 47, condition: "caries", surfaces: ["O", "D"] }, { tooth: 18, condition: "ausente" },
    { tooth: 38, condition: "extraccion_indicada", note: "Cordal semi-incluido" }, { tooth: 11, condition: "sellante", surfaces: ["V"] },
    { tooth: 24, condition: "implante" }, { tooth: 35, condition: "fractura", note: "Fractura de cúspide vestibular" },
  ];
  for (const e of odo) check(await doc.from("odontogram_entries").insert({ patient_id: p, ...e }), "odontograma");
  const plan = [
    { tooth: 46, surfaces: ["O"], procedure: "Resina compuesta", estimated_cost: 3500 },
    { tooth: 47, surfaces: ["O", "D"], procedure: "Resina compuesta", estimated_cost: 4000 },
    { tooth: 38, procedure: "Extracción de cordal", estimated_cost: 6500 },
    { tooth: 35, procedure: "Corona de porcelana", estimated_cost: 18000 },
    { procedure: "Profilaxis y fluorización", estimated_cost: 2500 },
  ];
  const planIds = [];
  for (const it of plan) planIds.push(check(await doc.from("treatment_plan_items").insert({ patient_id: p, ...it }).select("id").single(), "plan").id);
  check(await doc.from("treatment_plan_items").update({ status: "en_proceso" }).eq("id", planIds[0]), "plan estado");
  check(await doc.from("treatment_plan_items").update({ status: "en_proceso" }).eq("id", planIds[4]), "plan estado");
  check(await doc.from("treatment_plan_items").update({ status: "completado" }).eq("id", planIds[4]), "plan estado");
  check(await doc.from("clinical_entries").insert({ patient_id: p, kind: "nota", body: "Paciente refiere sensibilidad al frío en el cuadrante 4. Se indica radiografía periapical y resinas en 46 y 47." }), "nota");
  check(await doc.from("vital_signs").insert({ patient_id: p, systolic: 128, diastolic: 82, heart_rate: 74 }), "vitales");
  check(await recep.from("billing_charges").insert({ patient_id: p, treatment_plan_item_id: planIds[4], description: "Profilaxis y fluorización", amount: 2500, ars_coverage: 1500, ars_name: "ARS Demo", ars_status: "pendiente" }), "cargo");
  check(await recep.from("billing_payments").insert({ patient_id: p, amount: 1000, method: "tarjeta" }), "pago");
  fs.writeFileSync(process.argv[3], JSON.stringify({ patient: p }));
  console.log("ok", p);
}
main().catch((e) => { console.error(e); process.exit(1); });
