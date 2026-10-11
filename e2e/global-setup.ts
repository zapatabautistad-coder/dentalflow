import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD } from "./helpers";
import { MFA_SECRETS_FILE, MFA_USERS, totpCode } from "./mfa";

// Activa la app autenticadora (TOTP) de los usuarios de prueba que la necesitan y
// guarda sus secretos para que login() escriba el código. Solo base LOCAL.
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error("Faltan las variables de .env.e2e");

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const secrets: Record<string, string> = {};
  for (const user of MFA_USERS) {
    const email = `${user}@e2e.test`;
    const found = list.users.find((u) => u.email === email);
    if (!found) throw new Error(`No existe ${email}: corre npm run test:e2e:setup`);

    // Empieza limpio: borra factores de corridas anteriores.
    for (const factor of found.factors ?? []) {
      const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: found.id });
      if (error) throw error;
    }

    const client = createClient(url, anon, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (signInError) throw signInError;
    const { data: enrolled, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp" });
    if (enrollError) throw enrollError;
    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
      factorId: enrolled.id,
      code: totpCode(enrolled.totp.secret),
    });
    if (verifyError) throw verifyError;
    secrets[user] = enrolled.totp.secret;
  }

  writeFileSync(MFA_SECRETS_FILE, JSON.stringify(secrets, null, 2));
}
