const { createHmac } = require("node:crypto");
const fs = require("node:fs");
exports.totp = function (secret, now = Date.now()) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) { const v = a.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, "0"); }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(ctr).digest(); const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
};
exports.login = async function (page, user, secrets, slow = false) {
  await page.goto("http://localhost:3100/login");
  const t = slow ? { delay: 45 } : {};
  await page.locator('input[name="email"]').pressSequentially ? null : null;
  if (slow) { await page.locator('input[name="email"]').click(); await page.keyboard.type(`${user}@e2e.test`, t); await page.locator('input[name="password"]').click(); await page.keyboard.type("Prueba-E2e-2026!", { delay: 25 }); }
  else { await page.locator('input[name="email"]').fill(`${user}@e2e.test`); await page.locator('input[name="password"]').fill("Prueba-E2e-2026!"); }
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  const code = page.locator('input[autocomplete="one-time-code"]');
  await code.waitFor({ timeout: 20000 });
  if (slow) { await code.click(); await page.keyboard.type(exports.totp(secrets[user]), { delay: 90 }); } else await code.fill(exports.totp(secrets[user]));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL(/\/panel/, { timeout: 20000 });
};
