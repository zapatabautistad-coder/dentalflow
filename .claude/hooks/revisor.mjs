#!/usr/bin/env node
// Revisor de DentalFlow (hook PostToolUse de Claude Code).
// Después de cada edición busca en el archivo los errores graves de AGENTS.md
// ("Review guidelines"). Si no encuentra nada no dice nada (no gasta tokens);
// si encuentra algo, se lo avisa a Claude para que lo corrija.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);
const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = path.resolve(input.cwd || projectDir, filePath);
const rel = path.relative(projectDir, abs).split(path.sep).join("/");
const esCodigo = /^src\/.+\.(ts|tsx|js|jsx|mjs)$/.test(rel);
const esMigracion = /^supabase\/migrations\/[^/]+\.sql$/.test(rel);
if ((!esCodigo && !esMigracion) || !existsSync(abs)) process.exit(0);

const texto = readFileSync(abs, "utf8");
const avisos = [];

function linea(indice) {
  return texto.slice(0, indice).split("\n").length;
}

function buscar(regex, mensaje) {
  const r = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  for (const m of texto.matchAll(r)) avisos.push(`${rel}:${linea(m.index)}: ${mensaje}`);
}

const TABLAS_SOLO_INSERT = "clinical_entries|odontogram_entries|vital_signs|prescriptions|prescription_items";

if (esCodigo) {
  buscar(/\.select\(\s*(["'`])\s*\*\s*\1/, 'select("*"): usar columnas explícitas.');
  buscar(/dangerouslySetInnerHTML/, "dangerouslySetInnerHTML: prohibido con datos de Supabase o de la IA.");
  buscar(/\.delete\(\s*(\{[^)]*\})?\s*\)/, "delete() en Supabase: nada clínico se borra (se archiva, cancela o anula con motivo).");
  const update = new RegExp(`\\.from\\(\\s*["'](${TABLAS_SOLO_INSERT})["']\\s*\\)\\s*\\.(update|upsert)\\(\\s*([^)]*)`, "g");
  for (const m of texto.matchAll(update)) {
    // La receta se anula con UPDATE solo de void_reason (migración 027); eso sí vale.
    if (m[1] === "prescriptions" && m[2] === "update" && /^\{\s*void_reason\s*:[^,}]*\}$/.test(m[3].trim())) continue;
    avisos.push(`${rel}:${linea(m.index)}: UPDATE en una tabla clínica de solo INSERT: un error se corrige con otra entrada.`);
  }
  if (/^\s*["']use client["']/m.test(texto)) {
    buscar(/SUPABASE_SERVICE_ROLE_KEY|supabase\/admin/, "clave de servicio o admin.ts en un componente del navegador.");
  }
}

if (esMigracion) {
  buscar(/\bgrant\b[^;]*\bdelete\b[^;]*\bto\b/i, "GRANT DELETE: las tablas clínicas no tienen DELETE.");
  buscar(/\bcreate\s+policy\b[^;]*\bfor\s+delete\b/i, "política FOR DELETE: las tablas clínicas no tienen DELETE.");
  if (/\bsecurity\s+definer\b/i.test(texto) && !/\bsearch_path\b/i.test(texto)) {
    buscar(/\bsecurity\s+definer\b/i, "SECURITY DEFINER sin SET search_path.");
  }
  if (/\bcreate\s+table\b/i.test(texto)) {
    if (!/\benable\s+row\s+level\s+security\b/i.test(texto)) avisos.push(`${rel}: tabla nueva sin ENABLE ROW LEVEL SECURITY.`);
    if (!/\bgrant\b[^;]*\bto\s+authenticated\b/i.test(texto)) avisos.push(`${rel}: tabla nueva sin GRANT a authenticated.`);
    if (!/\baudit_row\b/.test(texto)) avisos.push(`${rel}: tabla nueva sin trigger audit_row (obligatorio si es clínica).`);
  }
}

if (avisos.length > 0) {
  process.stderr.write(
    `Revisor de DentalFlow (.claude/hooks/revisor.mjs) encontró posibles problemas graves:\n- ${avisos.join("\n- ")}\n` +
      "Corrígelos, o explica a Darys por qué no aplican.\n",
  );
  process.exit(2);
}
process.exit(0);
