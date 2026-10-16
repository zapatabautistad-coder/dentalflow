# Mapa del esquema

Esquema completo y actual: `supabase/schema.sql` (generado, `npm run db:schema`). Columnas y tipos: `src/lib/supabase/database.types.ts`. Las migraciones son el historial; leerlas solo para saber **por qué** algo es así.

Al agregar una migración: `npm run test:e2e:setup`, `npm run db:types`, `npm run db:schema` y actualizar esta tabla. La CI falla si `schema.sql` o los tipos no coinciden con las migraciones.

## Tablas (`public`)

Todas: RLS activo y aislamiento restrictivo por `clinic_id` (029), salvo `clinics` (por `id`) y `platform_admins`/`clinic_counters` (cerradas, solo funciones). Ninguna tiene DELETE. Columna "Otras": migraciones donde la tabla aparece (cambios o referencias).

| Tabla | Propósito | Creada | Otras | Regla |
|---|---|---|---|---|
| clinics | Clínica (tenant) | 029 | 030, 031, 034 | — |
| platform_admins | Dueños de la plataforma | 030 | 031, 034 | — |
| clinic_counters | Numeración por clínica (expediente, recibo) | 029 | — | — |
| profiles | Usuario: rol, clínica, activo, exequátur | 001 | 002, 009, 010, 012, 015, 018–020, 022, 024, 026, 027, 029–034 | cuentas |
| patients | Paciente; se archiva, no se borra | 001 | 002, 004, 009, 010, 012, 013, 017–020, 023–027, 029, 030, 033, 034 | cedula |
| patient_medical_history | Antecedentes y alergias (1 por paciente) | 009 | 024, 029, 033, 034 | — |
| appointments | Citas; sin solapamiento por doctor (028) | 001 | 002, 003, 009, 010, 017, 022, 025–029, 033, 034 | horarios |
| queue | Sala de espera | 001 | 002, 010, 014, 016, 024, 025, 029, 034 | sala-de-espera |
| doctor_schedules | Bloques semanales del doctor | 022 | 024, 029, 034 | horarios |
| doctor_time_off | Días libres del doctor | 022 | 024, 029, 034 | horarios |
| clinical_entries | Registro clínico (solo INSERT) | 012 | 023, 024, 029, 034 | — |
| odontogram_entries | Odontograma (solo INSERT) | 018 | 024, 029, 034 | odontograma |
| treatment_plan_items | Plan de tratamiento | 019 | 020, 024, 029, 034 | plan-tratamiento |
| billing_charges | Cargos; se anulan | 020 | 021, 024, 025, 029, 034 | facturacion |
| billing_payments | Pagos; se anulan | 020 | 024, 025, 029, 034 | facturacion |
| vital_signs | Signos vitales (solo INSERT) | 026 | 029, 034 | signos-vitales |
| prescriptions | Recetas; se anulan con motivo | 027 | 029, 033, 034 | recetas |
| prescription_items | Medicamentos de la receta (solo INSERT) | 027 | 029, 033, 034 | recetas |
| audit_log | Auditoría de todo cambio | 009 | 014, 015, 024, 025, 029, 030, 034 | — |

## Funciones clave

| Función | Qué hace | Última versión |
|---|---|---|
| `get_my_role()` / `get_my_clinic()` | Rol y clínica del usuario; base de todas las políticas | 031 / 029 |
| `mfa_satisfied()` | Segundo paso cumplido (aal2, o sin factor y sin rol admin/doctor) | 032 |
| `is_platform_admin()` | Dueño de plataforma con aal2 | 034 |
| `set_clinic_id()` | Fija `clinic_id`; bloquea cambiar clínica o paciente | 033 |
| `audit_row()` | Escribe en `audit_log` | 029 |
| `stamp_created()` | Autor y fecha de pacientes y citas | 034 |
| `block_truncate()` | Bloquea TRUNCATE | 034 |
| `create_prescription()` | Crea receta con sus medicamentos | 027 |
| `platform_*()` | Alta y activación de clínicas | 030 |

No ejecutar 005 ni 006. Pendientes de aplicar en producción: ver "Estado" en `CLAUDE.md`.
