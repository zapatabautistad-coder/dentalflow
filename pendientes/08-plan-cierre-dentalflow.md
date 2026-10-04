# Plan para terminar DentalFlow (acordado el 2026-10-03, empieza al día siguiente)

Hecho: la 022 de cuentas temporales se descartó (revertida). Medicamentos solo doctor: 023 aplicada.
- La migración `022_temporary_accounts.sql` (cuentas temporales) está solo en la rama `claude/gifted-newton-nwaspk`, sin aplicar ni publicar. Recomendación: descartarla junto con su código. Así Horarios toma el número 022.

## Orden
1. **Horarios** (022 aplicada en producción; pantalla pendiente con Copilot): horario por doctor, días libres, bloquear citas fuera de turno (trigger en la base) y ver huecos libres. Base: Claude, con OK antes de aplicar. Pantalla: Copilot.
2. **Índices de rendimiento** (`024_indices_claves_foraneas.sql`, 19 índices, aplicada en producción): 15 claves foráneas sin índice, según el asesor de Supabase (`*_created_by`, `*_voided_by`, `audit_log.changed_by`, `queue.appointment_id`, etc.). Es una migración pequeña y necesita OK.
3. **Pruebas de punta a punta** (hechas, 17 pruebas en `e2e/`, contra Supabase local) con Playwright: login, paciente, cita, sala, odontograma, plan, cobro y horarios (cita fuera de horario rechazada), con cada rol.
4. **Revisión de seguridad** (hecha; informe en `10-revision-seguridad.md`; falta aplicar 025).
5. **Mejoras clínicas y legales** (orden y detalle en `09-mejoras-clinicas-revision.md`): signos vitales, alerta médica, recetas con exequátur, NCF (tras hablar con un contador), consentimientos y radiografías, odontograma previo vs. hecho, superficie incisal y sillón. Base: Claude; pantallas: Copilot.
6. **Antes de la primera clínica**, lo hace el usuario con pasos:
   - plan Pro de Supabase
   - "Prevent use of leaked passwords"
   - borrar los datos de prueba (con OK): hoy son 3 pacientes con cédula usados para probar las citas y sus 4 citas (conteo del 2026-10-04). Las cédulas son solo de prueba.
   - desactivar las cuentas de prueba (Dr. Prueba, JHON MAXWEL)
   - respaldos

## Asesores de Supabase (2026-10-03)
- Seguridad: `get_my_role()` ejecutable por `authenticated`. Es intencional, solo devuelve el rol propio. Contraseñas filtradas: requiere plan Pro.
- Rendimiento: índices faltantes (punto 2). Hay varias políticas permisivas por tabla, aceptable con el volumen actual.

## Hallazgos de las pruebas E2E (2026-10-04)
- **Corregido:** en "Nueva cita", al elegir un paciente del buscador la selección se borraba sola
  (el buscador estaba dentro de un `<label>` y el clic se reenviaba al botón "Cambiar").
- **Pendiente (menor):** si se escribe en un formulario antes de que la página termine de cargar
  (hidratación), lo escrito en campos no controlados puede perderse. En celulares lentos podría
  notarse. Revisar en la revisión de seguridad/calidad.
