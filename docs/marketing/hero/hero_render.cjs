const { chromium } = require("@playwright/test"); const S = __dirname;
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await p.goto(`file://${S}/hero.html`); await p.evaluate(() => document.fonts.ready); await p.waitForFunction(() => [...document.images].every((i) => i.complete)); await p.waitForTimeout(200);
  await p.screenshot({ path: S + "/DentalFlow-hero-4K.png" }); await b.close(); })();
