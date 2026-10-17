#!/usr/bin/env node
// Verificación de DentalFlow con salida corta (ahorra tokens):
// cada paso en verde imprime una sola línea; el primero que falla imprime su
// salida (recortada a lo útil) y detiene el resto.
//   npm run verify:fast → lint + typecheck + pruebas unitarias (sin base de datos)
//   npm run verify      → lo anterior + build + pruebas de la base (Supabase local en Docker)
// Salida completa de un paso que falla: DF_SALIDA_COMPLETA=1 npm run verify
import { spawnSync } from "node:child_process";

const PASOS = {
  fast: [
    ["lint", "npm run lint --silent"],
    ["typecheck", "npm run typecheck --silent"],
    ["unitarias", "npm test --silent"],
  ],
};
PASOS.full = [
  ...PASOS.fast,
  ["build", "npm run build --silent"],
  ["base de datos", "npm run test:db --silent"],
];

const modo = process.argv[2] === "fast" ? "fast" : "full";
const completa = process.env.DF_SALIDA_COMPLETA === "1";
const ERROR = /error|fail|✗|×|⨯|expected|received|cannot|not found|unexpected|not ok|\bat\s.+:\d+:\d+/i;

function recortar(texto) {
  const lineas = texto
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (completa || lineas.length <= 80) return lineas.join("\n");
  const indices = new Set();
  lineas.forEach((l, i) => {
    if (ERROR.test(l)) [i - 1, i, i + 1].forEach((j) => j >= 0 && j < lineas.length && indices.add(j));
  });
  for (let i = Math.max(0, lineas.length - 20); i < lineas.length; i++) indices.add(i);
  const elegidas = [...indices].sort((a, b) => a - b).slice(0, 120).map((i) => lineas[i]);
  return `${elegidas.join("\n")}\n(${lineas.length - elegidas.length} líneas omitidas; completa: DF_SALIDA_COMPLETA=1)`;
}

for (const [nombre, comando] of PASOS[modo]) {
  const inicio = Date.now();
  const r = spawnSync(comando, { shell: true, encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  if (r.status !== 0) {
    process.stdout.write(`✗ ${nombre} falló (${segundos} s): ${comando}\n${recortar(`${r.stdout ?? ""}\n${r.stderr ?? ""}`)}\n`);
    process.exit(r.status ?? 1);
  }
  process.stdout.write(`✓ ${nombre} (${segundos} s)\n`);
}
process.stdout.write(`✓ verify${modo === "fast" ? ":fast" : ""} completo\n`);
