const { chromium } = require("@playwright/test"); const { login } = require("./lib.cjs");
const S = __dirname; const secrets = require(S + "/mfa.json"); const { patient } = require(S + "/ids.json");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const d = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await d.newPage(); await login(p, "admin", secrets);
  await p.goto("http://localhost:3100/panel"); await p.waitForLoadState("networkidle"); await p.mouse.move(1435, 895); await p.waitForTimeout(800);
  await p.screenshot({ path: S + "/hero_desktop.png" });
  const m = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const q = await m.newPage(); await login(q, "admin", secrets);
  await q.goto(`http://localhost:3100/patients/${patient}/odontograma`); await q.waitForLoadState("networkidle");
  await q.getByRole("button", { name: /^Diente 46/ }).click(); await q.waitForTimeout(600);
  await q.evaluate(() => window.scrollTo(0, 0)); await q.waitForTimeout(300);
  await q.screenshot({ path: S + "/hero_mobile.png" });
  await b.close();
})();
