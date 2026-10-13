#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${E2E_SUPABASE_DIR:-$ROOT/.e2e-supabase}"
SB="$ROOT/node_modules/.bin/supabase"

if [ ! -x "$SB" ]; then
  echo "No se encontró el CLI fijado en node_modules/.bin/supabase." >&2
  echo "Ejecuta npm ci antes de npm run test:db." >&2
  exit 1
fi

mkdir -p "$WORK/supabase/tests"
rm -f "$WORK"/supabase/tests/*.sql
cp "$ROOT"/supabase/tests/*.sql "$WORK/supabase/tests/"

cd "$WORK"
"$SB" test db
