#!/usr/bin/env bash
# Genera supabase/schema.sql: foto del esquema public tal como queda tras todas
# las migraciones (Supabase LOCAL de las E2E, nunca producción). Sin dueños, SET
# ni líneas vacías. Requiere antes: npm run test:e2e:setup. Uso: npm run db:schema
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${E2E_SUPABASE_DIR:-$ROOT/.e2e-supabase}"
OUT="$ROOT/supabase/schema.sql"
TMP="$(mktemp)"
cd "$WORK"
"$ROOT/node_modules/.bin/supabase" db dump --local --schema public -f "$TMP" >/dev/null 2>&1
{
  echo "-- Generado con \`npm run db:schema\` desde las migraciones. No editar a mano."
  echo "-- Solo referencia: lo que se aplica en producción son las migraciones."
  grep -vE 'OWNER TO|^SET |^SELECT pg_catalog\.set_config|^$' "$TMP"
} > "$OUT"
rm -f "$TMP"
echo "Esquema generado en supabase/schema.sql"
