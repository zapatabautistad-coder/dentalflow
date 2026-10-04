# Mejoras clínicas (revisión externa de capturas, 2026-10-04)

Ya resuelto en el código: "Filling" bien escrito, rol "Asistente dental" (no Nursing),
medicamentos solo el doctor (023). ARS es texto libre: "Palic" era un dato de prueba.

Pendiente, en orden de prioridad:
1. **Signos vitales antes del procedimiento**: PA (mmHg), frecuencia cardíaca, glucemia.
   Tabla nueva solo INSERT/SELECT, auditada, autor y hora por la base.
2. **Chip rojo de alerta médica** junto al nombre en Pacientes y Sala de espera
   (alergias, hipertensión, cardiopatías), con los antecedentes ya guardados.
3. **Odontograma: estado inicial vs. hecho en la clínica** (capa "Inicial" / "Tratamiento").
4. **Superficie I (incisal) separada de O (oclusal)** según el diente (anteriores vs. posteriores).
5. **Sillón / box** en la sala de espera (en clínicas con más de 2 sillones).
