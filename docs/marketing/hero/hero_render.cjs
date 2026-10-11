const { chromium } = require("@playwright/test"); const S = __dirname;
// Exporta cuatro versiones 4K: con texto (venta y redes) y sin texto (portada web, texto en HTML), en español e inglés.
const OUT = [
  ["es", 1, "DentalFlow-hero-4K-es.png"], ["en", 1, "DentalFlow-hero-4K-en.png"],
  ["es", 0, "DentalFlow-hero-web-4K-es.png"], ["en", 0, "DentalFlow-hero-web-4K-en.png"],
];
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  for (const [lang, text, file] of OUT) {
    await p.goto(`file://${S}/hero.html?lang=${lang}&text=${text}`); await p.evaluate(() => document.fonts.ready);
    await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)); await p.waitForTimeout(200);
    await p.screenshot({ path: `${S}/${file}` });
  }
  await b.close(); })();
