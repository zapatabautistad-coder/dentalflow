#!/usr/bin/env bash
# Sesiones de Claude Code en la nube: instala las dependencias si faltan o están
# desactualizadas, para que lint, test y build funcionen desde el primer turno.
# En la PC no hace nada. No imprime nada si todo va bien (no gasta tokens).
set -uo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if [ -f node_modules/.package-lock.json ] && [ node_modules/.package-lock.json -nt package-lock.json ]; then
  exit 0
fi
log="$(mktemp)"
if ! npm ci --no-audit --no-fund >"$log" 2>&1; then
  echo "No se pudieron instalar las dependencias (npm ci). Últimas líneas:" >&2
  tail -15 "$log" >&2
fi
rm -f "$log"
exit 0
