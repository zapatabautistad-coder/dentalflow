// Genera el molar del logo ya reducido para cada lugar donde se muestra, en pantalla
// normal y de alta densidad (1x, 1.25x, 1.5x, 2x y 3x). El navegador elige el que
// corresponde (srcSet en src/app/brand-mark.tsx) en vez de encoger el original de
// 389×512 hasta 8 veces, que borra el borde plateado y los reflejos.
// Uso: node scripts/molar-tamanos.mjs  (si se recolorea el molar, volver a correrlo)
import sharp from "sharp";

const SOURCE = "public/dentalflow-mark-sky.png";
const RATIO = 389 / 512;

// Alto en pantalla (px CSS) del molar: 80 % del orbe de cada lugar.
const SLOTS = { compacto: 38.4, barraLateral: 64, login: 160 };
const DENSITIES = [1, 1.25, 1.5, 2, 3];

// Casi del tamaño original no vale la pena reducir: se usa el original (389w).
const widths = new Set();
for (const height of Object.values(SLOTS)) {
  for (const density of DENSITIES) {
    const width = Math.ceil(height * RATIO * density);
    if (width < 350) widths.add(width);
  }
}

for (const width of [...widths].sort((a, b) => a - b)) {
  await sharp(SOURCE)
    .resize({ width, kernel: "lanczos3" })
    // Un toque de nitidez: al reducir tanto, el contorno pierde definición.
    .sharpen({ sigma: 0.6 })
    .png({ compressionLevel: 9 })
    .toFile(`public/dentalflow-mark-sky-${width}.png`);
  console.log(width);
}
