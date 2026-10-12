---
paths:
  - "src/app/**/waiting-room/**"
  - "supabase/migrations/014_*"
  - "supabase/migrations/016_*"
---
# Sala de espera

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Sala de espera (`/waiting-room`, tabla `queue`): recepción/admin mueven toda la fila; el doctor solo sus turnos y tiene "Llamar siguiente". Horas y pasos válidos (en_espera → llamado → en_atencion → atendido, o cancelado) los impone el trigger `stamp_queue` (014); sin DELETE y con auditoría. La posición del turno la asigna la base (trigger `assign_queue_position`, 016, con candado por fecha); la app no la calcula.
