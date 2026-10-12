#!/usr/bin/env node
// Ejecuta un comando de verificación (test, lint, build) y devuelve solo lo útil,
// para ahorrar tokens: si pasa, las últimas líneas; si falla, los errores y el final.
// Lo activa guardian.mjs. Para ver la salida completa: DF_SALIDA_COMPLETA=1 <comando>.
import { spawn } from "node:child_process";

const comando = process.argv.slice(2).join(" ");
const hijo = spawn(comando, { shell: true, env: process.env });
let salida = "";
hijo.stdout.on("data", (d) => (salida += d));
hijo.stderr.on("data", (d) => (salida += d));

const ERROR = /error|fail|✗|×|⨯|expected|received|cannot|not found|unexpected|\bat\s.+:\d+:\d+/i;

hijo.on("close", (codigo) => {
  const lineas = salida
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "") // colores de la terminal
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  const total = lineas.length;
  let mostrar;
  if (codigo === 0) {
    mostrar = lineas.slice(-8);
  } else if (total <= 150) {
    mostrar = lineas;
  } else {
    const indices = new Set();
    lineas.slice(0, 15).forEach((_, i) => indices.add(i));
    lineas.forEach((l, i) => {
      if (ERROR.test(l)) [i - 1, i, i + 1].forEach((j) => j >= 0 && j < total && indices.add(j));
    });
    for (let i = Math.max(0, total - 30); i < total; i++) indices.add(i);
    mostrar = [...indices].sort((a, b) => a - b).slice(0, 160).map((i) => lineas[i]);
  }
  const omitidas = total - mostrar.length;
  const encabezado =
    codigo === 0
      ? `✓ "${comando}" terminó bien.`
      : `✗ "${comando}" falló (código ${codigo}).`;
  const pie =
    omitidas > 0
      ? `(${omitidas} líneas omitidas por .claude/hooks/salida-corta.mjs; completa: DF_SALIDA_COMPLETA=1 ${comando})`
      : "";
  process.stdout.write([encabezado, ...mostrar, pie].filter(Boolean).join("\n") + "\n");
  process.exit(codigo ?? 1);
});
