# Plan para terminar DentalFlow (acordado el 2026-10-03, empieza al día siguiente)

Antes de empezar: el usuario debe confirmar "descarta 022 y empieza".
- La migración `022_temporary_accounts.sql` (cuentas temporales) está solo en la rama `claude/gifted-newton-nwaspk`, sin aplicar ni publicar. Recomendación: descartarla junto con su código. Así Horarios toma el número 022.

## Orden
1. **Horarios**: horario por doctor, días libres, bloquear citas fuera de turno (trigger en la base) y ver huecos libres. Base: Claude, con OK antes de aplicar. Pantalla: Copilot.
2. **Índices de rendimiento**: 15 claves foráneas sin índice, según el asesor de Supabase (`*_created_by`, `*_voided_by`, `audit_log.changed_by`, `queue.appointment_id`, etc.). Es una migración pequeña y necesita OK.
3. **Pruebas de punta a punta** con Playwright: login, paciente, cita, sala, odontograma, plan y cobro, con cada rol.
4. **Revisión de seguridad** completa del código.
5. **Antes de la primera clínica**, lo hace el usuario con pasos:
   - plan Pro de Supabase
   - "Prevent use of leaked passwords"
   - borrar los datos de prueba (con OK)
   - desactivar las cuentas de prueba (Dr. Prueba, JHON MAXWEL)
   - respaldos

## Asesores de Supabase (2026-10-03)
- Seguridad: `get_my_role()` ejecutable por `authenticated`. Es intencional, solo devuelve el rol propio. Contraseñas filtradas: requiere plan Pro.
- Rendimiento: índices faltantes (punto 2). Hay varias políticas permisivas por tabla, aceptable con el volumen actual.
