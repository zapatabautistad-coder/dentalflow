---
paths:
  - "src/app/**/horarios/**"
  - "src/lib/schedule*"
  - "supabase/migrations/022_*"
---
# Horarios

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Horarios (`/horarios`, migración 022, pantalla de Copilot PR #13): bloques semanales y días libres por doctor, huecos libres (`src/lib/schedule.ts`). Los errores viajan en la URL solo como clave conocida (`errorKey`), nunca como texto libre.
