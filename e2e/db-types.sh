#!/usr/bin/env bash
# Genera src/lib/supabase/database.types.ts desde el Supabase LOCAL de las E2E
# (todas las migraciones menos 005 y 006). Nunca contra producción.
# Requiere antes: npm run test:e2e:setup. Uso: npm run db:types
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${E2E_SUPABASE_DIR:-$ROOT/.e2e-supabase}"
OUT="$ROOT/src/lib/supabase/database.types.ts"
cd "$WORK"
"$ROOT/node_modules/.bin/supabase" gen types typescript --local --schema public 2>/dev/null > "$OUT.tmp"
{ echo "// Generado con \`npm run db:types\` desde las migraciones. No editar a mano."; cat "$OUT.tmp"; } > "$OUT"
rm -f "$OUT.tmp"
echo "Tipos generados en src/lib/supabase/database.types.ts"
