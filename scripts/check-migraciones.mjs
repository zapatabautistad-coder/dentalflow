#!/usr/bin/env node
// Regla: toda migración nueva o cambiada viaja con su prueba SQL (supabase/tests/)
// y con su línea en supabase/MAPA.md. La usan dos guardias con el mismo código:
//   - Hook de Claude Code (guardian.mjs, antes de git commit): --staged
//   - CI (.github/workflows/pruebas.yml, en cada PR): --base origin/<rama base>
// Copilot hace commits en GitHub y no pasa por los hooks: la CI es la que lo frena.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const staged = args.includes("--staged");
const iBase = args.indexOf("--base");
const raiz = git(["rev-parse", "--show-toplevel"]) ?? process.cwd();

function git(a) {
  try {
    return execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function lista(salida) {
  return (salida ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}

const base = iBase >= 0 ? args[iBase + 1] : "origin/main";
const cambiados = new Set();
if (git(["rev-parse", "--verify", "--quiet", base]) !== null) {
  lista(git(["diff", "--name-only", "--diff-filter=AMR", `${base}...HEAD`])).forEach((f) => cambiados.add(f));
} else if (!staged) {
  console.error(`check-migraciones: no existe la referencia ${base}.`);
  process.exit(1);
}
if (staged) lista(git(["diff", "--cached", "--name-only", "--diff-filter=AMR"])).forEach((f) => cambiados.add(f));

const migraciones = [...cambiados].filter(
  (f) => /^supabase\/migrations\/\d{3}_[^/]+\.sql$/.test(f) && existsSync(path.join(raiz, f)),
);
if (migraciones.length === 0) process.exit(0);

const problemas = [];
if (![...cambiados].some((f) => /^supabase\/tests\/[^/]+\.sql$/.test(f))) {
  problemas.push("falta su prueba SQL: agrega o actualiza un archivo en supabase/tests/ en este mismo PR.");
}
const mapaRuta = path.join(raiz, "supabase", "MAPA.md");
const mapa = existsSync(mapaRuta) ? readFileSync(mapaRuta, "utf8") : "";
for (const m of migraciones) {
  const numero = path.basename(m).slice(0, 3);
  if (!new RegExp(`(^|[^0-9])${numero}([^0-9]|$)`).test(mapa)) {
    problemas.push(`${numero} no aparece en supabase/MAPA.md: agrega su línea (tabla o función y para qué sirve).`);
  }
}

if (problemas.length > 0) {
  console.error(`Migraciones en este cambio: ${migraciones.join(", ")}`);
  problemas.forEach((p) => console.error(`- ${p}`));
  process.exit(1);
}
