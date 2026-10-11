import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

// Secretos TOTP de los usuarios de prueba (los escribe e2e/global-setup.ts).
// Solo existen en la base LOCAL de las pruebas; el archivo está en .gitignore.
export const MFA_SECRETS_FILE = path.join(__dirname, "..", ".e2e-mfa.json");

// Admin y doctor deben usar verificación en dos pasos (src/lib/mfa.ts).
export const MFA_USERS = ["admin", "doctor", "admin-b", "doctor-b"] as const;

export function readMfaSecret(user: string): string | undefined {
  try {
    const secrets = JSON.parse(readFileSync(MFA_SECRETS_FILE, "utf8")) as Record<string, string>;
    return secrets[user];
  } catch {
    return undefined;
  }
}

// Código de 6 dígitos (RFC 6238: SHA-1, 30 s), igual que una app autenticadora.
export function totpCode(secretBase32: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secretBase32.replace(/=+$/, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));

  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(binary).padStart(6, "0");
}
