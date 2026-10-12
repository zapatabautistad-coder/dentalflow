---
paths:
  - "src/app/**/recetas/**"
  - "src/lib/prescriptions*"
  - "src/lib/medication-allergy*"
  - "supabase/migrations/027_*"
---
# Recetas

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Recetas (migración 027): `prescriptions` + `prescription_items`; se crean juntas con `create_prescription(p_patient_id, p_items jsonb, p_indications, p_appointment_id)` (no se agregan medicamentos después). Solo el doctor receta y anula la suya con motivo; todos leen. La base copia `doctor_name` y `doctor_exequatur` al crear; sin exequátur no se receta. `profiles.exequatur` lo asigna el admin en Cuentas. Pantalla en `/patients/[id]/recetas` (solo el doctor receta; aviso de alergias con `matchingMedicationAllergy`) e impresión en `/patients/[id]/recetas/[recetaId]` (reusa el estilo de impresión del recibo). Validación en `src/lib/prescriptions.ts` (con pruebas).
