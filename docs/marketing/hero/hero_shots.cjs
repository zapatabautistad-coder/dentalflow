const { chromium } = require("@playwright/test"); const { login } = require("./lib.cjs");
const S = __dirname; const secrets = require(S + "/mfa.json"); const { patient } = require(S + "/ids.json");
// HERO_LANG=en toma las pantallas con la app en inglés (hero_desktop_en.png, hero_mobile_en.png).
const LANG = process.env.HERO_LANG === "en" ? "en" : "es", SUF = LANG === "en" ? "_en" : "";
const setLang = (ctx) => ctx.addInitScript((l) => localStorage.setItem("dentalflow-language", l), LANG);
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const d = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); await setLang(d);
  const p = await d.newPage(); await login(p, "admin", secrets);
  await p.goto("http://localhost:3100/panel"); await p.waitForLoadState("networkidle"); await p.mouse.move(1435, 895); await p.waitForTimeout(800);
  await p.screenshot({ path: S + `/hero_desktop${SUF}.png` });
  const m = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await setLang(m);
  const q = await m.newPage(); await login(q, "admin", secrets);
  await q.goto(`http://localhost:3100/patients/${patient}/odontograma`); await q.waitForLoadState("networkidle");
  await q.getByRole("button", { name: /^(Diente|Tooth) 46/ }).click(); await q.waitForTimeout(600);
  await q.evaluate(() => window.scrollTo(0, 0)); await q.waitForTimeout(300);
  await q.screenshot({ path: S + `/hero_mobile${SUF}.png` });
  await b.close();
})();
