# Mejoras clínicas y legales (revisiones externas, 2026-10-04)

Fuentes: revisión de capturas y revisión del esquema por Gemini.
Ya resuelto: "Filling" bien escrito, rol "Asistente dental", medicamentos solo el doctor (023).
ARS es texto libre: "Palic" era un dato de prueba.

Reparto del trabajo: **Claude** hace la base (migración, triggers, RLS, con OK antes de aplicar)
y la lógica con pruebas; **Copilot** hace la pantalla con un prompt que prepara Claude.
Claude revisa el PR de Copilot antes del merge.

## Orden (después de Horarios, pruebas E2E y revisión de seguridad)
1. **Signos vitales** (base y lógica hechas: migración 026 y `src/lib/vital-signs.ts`; 026 aplicada; falta la pantalla con Copilot) antes del procedimiento: PA sistólica/diastólica, frecuencia cardíaca,
   glucemia; ligados a la cita o al turno. Solo INSERT/SELECT, auditado, autor y hora por la base.
2. **Chip rojo de alerta médica** junto al nombre en Pacientes y Sala de espera, con los
   antecedentes ya guardados (alergias, hipertensión, anticoagulantes, etc.). Solo pantalla: Copilot.
3. **Recetas** (base hecha: migración 027, sin aplicar; falta pantalla con Copilot) para la farmacia: `prescriptions` + `prescription_items` (medicamento, dosis,
   posología para casa). Solo el doctor. Agregar **exequátur** al perfil del doctor e imprimirlo.
4. **Comprobantes fiscales DGII (NCF / e-CF)**. Bloqueado: antes consultar con un contador qué
   tipo usa la clínica (B01/B02, papel o electrónico). Los NCF salen de rangos autorizados por la
   DGII con vencimiento: nunca se inventan.
5. **Consentimientos informados** (ligados al procedimiento del plan) y **radiografías/archivos**
   (Storage privado de Supabase con permisos por rol).
6. **Odontograma: hallazgo previo vs. hecho en la clínica** (marca `is_preexisting`).
7. **Superficie I (incisal) separada de O (oclusal)** y **sillón / box** en la sala de espera.

## Descartado por ahora
- Multi-país (tabla `clinics`, `country_code`, renombrar ARS a "insurance"): cambio enorme antes
  de la primera clínica; el producto es solo para República Dominicana.
- Varias clínicas: por ahora un proyecto de Supabase por clínica. Decidir una base compartida
  cuando haya varias clínicas.
