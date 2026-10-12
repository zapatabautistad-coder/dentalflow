#!/usr/bin/env node
// Guardián de DentalFlow (hook PreToolUse de Claude Code).
// Bloquea lo que ningún agente debe hacer aunque olvide CLAUDE.md: subir a main,
// unir PR, cambiar producción (Supabase/Vercel), leer claves y editar migraciones
// que ya están en main. Además recorta la salida de test, lint y build.
// Frena errores, no a quien quiera saltárselo a propósito: la protección de fondo
// es la protección de la rama main en GitHub y el RLS de Supabase.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // sin datos válidos no se decide nada
}

const tool = input.tool_name ?? "";
const ti = input.tool_input ?? {};
const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const cwd = input.cwd || projectDir;

const RAMA_PROTEGIDA = /^(main|master)$/;
// .env, .env.local, .env.production(.local), .env.development(.local). No .env.e2e ni .env.example.
const ARCHIVO_SECRETO = /^\.env(\.(local|production|development)(\.local)?)?$/;
const SECRETO_EN_COMANDO =
  /(^|[\s"'=:/<>(])\.env(\.(local|production|development)(\.local)?)?(?=$|[\s"';|&)<>])/;

function bloquear(motivo) {
  process.stderr.write(`Bloqueado por .claude/hooks/guardian.mjs: ${motivo}\n`);
  process.exit(2);
}

function git(args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

// Quita los cuerpos de heredoc (mensajes de commit, archivos escritos con cat <<EOF):
// son texto, no comandos.
function sinHeredocs(cmd) {
  return cmd.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, "");
}

function tramos(cmd) {
  return cmd.split(/;|&&|\|\||\||\n/).map((t) => t.trim()).filter(Boolean);
}

function palabras(tramo) {
  return tramo.replace(/["'`]/g, " ").split(/\s+/).filter(Boolean);
}

function subeAMain(cmd) {
  for (const tramo of tramos(cmd)) {
    const p = palabras(tramo);
    const iGit = p.findIndex((x) => /(^|\/)git(\.exe)?$/.test(x));
    if (iGit < 0) continue;
    const iPush = p.indexOf("push", iGit + 1);
    if (iPush < 0) continue;
    const args = p.slice(iPush + 1);
    if (args.some((a) => a === "--all" || a === "--mirror")) return true;
    const refspecs = args.filter((a) => !a.startsWith("-")).slice(1); // el primero es el remoto
    const destinos = refspecs.map((r) => r.replace(/^\+/, "").split(":").pop().replace(/^refs\/heads\//, ""));
    if (destinos.some((d) => RAMA_PROTEGIDA.test(d))) return true;
    if (destinos.length === 0 || destinos.includes("HEAD")) {
      const actual = git(["branch", "--show-current"]);
      if (actual && RAMA_PROTEGIDA.test(actual)) return true;
    }
  }
  return false;
}

function revisarBash(cmdOriginal) {
  const cmd = sinHeredocs(cmdOriginal);
  if (subeAMain(cmd)) {
    bloquear("subir cambios a main. main solo recibe cambios por PR y solo Darys une.");
  }
  if (/\bgh\s+pr\s+merge\b/.test(cmd) || /\bgh\s+api\b[^\n]*\/merge\b/.test(cmd)) {
    bloquear("unir un PR. Solo Darys lo ordena y lo une en GitHub.");
  }
  if (/\bsupabase\b[^\n;&|]*\bdb\s+push\b/.test(cmd) && !/--local\b/.test(cmd)) {
    bloquear("aplicar migraciones en la base remota. Las aplica Darys en producción.");
  }
  if (/\bsupabase\b[^\n;&|]*(--linked|--db-url)\b/.test(cmd)) {
    bloquear("comando de Supabase contra la base remota. Usa la base local (npm run test:e2e:setup).");
  }
  if (/\bvercel\b[^\n;&|]*(--prod\b|\bpromote\b|\brollback\b|\benv\s+(add|rm|pull)\b)/.test(cmd)) {
    bloquear("cambiar producción en Vercel. Producción se publica sola al unir a main.");
  }
  for (const tramo of tramos(cmd)) {
    const primera = palabras(tramo)[0];
    if (primera === "git") continue; // mensajes de commit pueden nombrar .env.local
    if (SECRETO_EN_COMANDO.test(tramo)) {
      bloquear(".env y .env.local tienen claves reales y no se leen ni se cambian desde Claude.");
    }
  }
}

function rutaRelativa(p) {
  const abs = path.resolve(cwd, p);
  return { abs, rel: path.relative(projectDir, abs).split(path.sep).join("/") };
}

function migracionYaEnMain(rel) {
  if (git(["cat-file", "-e", `origin/main:${rel}`]) !== null) return true;
  // Sin origin/main a mano: se protege todo lo que ya está en el historial.
  if (git(["rev-parse", "--verify", "--quiet", "origin/main"]) === null) {
    return Boolean(git(["ls-tree", "HEAD", "--", rel]));
  }
  return false;
}

function revisarArchivo(filePath) {
  if (!filePath) return;
  const { abs, rel } = rutaRelativa(filePath);
  if (ARCHIVO_SECRETO.test(path.basename(abs))) {
    bloquear(`${rel} tiene claves reales y no se cambia desde Claude.`);
  }
  if (/^supabase\/migrations\/[^/]+\.sql$/.test(rel) && existsSync(abs) && migracionYaEnMain(rel)) {
    bloquear(`${rel} ya está en main. Una migración existente nunca se edita: el cambio va en una migración nueva.`);
  }
}

const SQL_ESCRITURA =
  /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|vacuum|reindex|cluster|copy|call|merge|refresh|lock)\b|\bcomment\s+on\b|\bdo\s*(\$|')|\bset\s+(role|session)\b/i;

function revisarSql(query) {
  const limpio = String(query ?? "")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''");
  if (SQL_ESCRITURA.test(limpio)) {
    bloquear("execute_sql solo para leer (SELECT). Los cambios en la base van en una migración nueva que aplica Darys.");
  }
}

function revisarMcp(nombre) {
  const accion = nombre.split("__").pop();
  if (accion === "merge_pull_request" || accion === "enable_pr_auto_merge") {
    bloquear("unir un PR o activar auto-merge. Solo Darys lo ordena y lo une en GitHub.");
  }
  if (["push_files", "create_or_update_file", "delete_file"].includes(accion)) {
    const rama = ti.branch ?? "main";
    if (RAMA_PROTEGIDA.test(rama)) bloquear("escribir directo en main. Los cambios van en una rama y un PR.");
  }
  if (accion === "apply_migration") {
    bloquear("aplicar migraciones en producción. Las aplica Darys.");
  }
  if (accion === "execute_sql") revisarSql(ti.query);
}

// Comandos de verificación cuya salida se recorta (ver salida-corta.mjs).
const VERIFICACION =
  /^(npm\s+(test|run\s+(test|lint|build)(:[\w-]+)?)|npx\s+(vitest\s+run|tsc\s+--noEmit|eslint|playwright\s+test))(\s+[^;&|<>`$()]*)?$/;

function recortarSalida(cmd) {
  const limpio = cmd.trim();
  if (!VERIFICACION.test(limpio)) return;
  const envoltorio = path.join(projectDir, ".claude", "hooks", "salida-corta.mjs").split(path.sep).join("/");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "Verificación con salida recortada",
        updatedInput: { ...ti, command: `node "${envoltorio}" ${limpio}` },
      },
    }),
  );
}

if (tool === "Bash") {
  revisarBash(String(ti.command ?? ""));
  recortarSalida(String(ti.command ?? ""));
} else if (["Edit", "Write", "MultiEdit"].includes(tool)) {
  revisarArchivo(ti.file_path);
} else if (tool === "NotebookEdit") {
  revisarArchivo(ti.notebook_path);
} else if (tool.startsWith("mcp__")) {
  revisarMcp(tool);
}
process.exit(0);
