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
| encounters | Consulta: agrupa lo registrado en una visita; abre doctor/asistente, cierra el doctor; cerrada no cambia | 035 | 037, 038 | — |
| clinical_entries | Registro clínico (solo INSERT) | 012 | 023, 024, 029, 034–037 | — |
| odontogram_entries | Odontograma (solo INSERT) | 018 | 024, 029, 034–038 | odontograma |
| treatment_plan_items | Plan de tratamiento | 019 | 020, 024, 029, 034, 038 | plan-tratamiento |
| procedures_performed | Procedimiento realizado en una consulta abierta; completa el ítem del plan; se anula con motivo (anula su hallazgo) | 038 | — | plan-tratamiento |
| billing_charges | Cargos; se anulan | 020 | 021, 024, 025, 029, 034 | facturacion |
| billing_payments | Pagos; se anulan | 020 | 024, 025, 029, 034 | facturacion |
| vital_signs | Signos vitales (solo INSERT; una corrección por toma) | 026 | 029, 034–037 | signos-vitales |
| prescriptions | Recetas; se anulan con motivo | 027 | 029, 033–035, 037 | recetas |
| prescription_items | Medicamentos de la receta (solo INSERT) | 027 | 029, 033, 034 | recetas |
| ai_consents | Consentimiento del paciente para IA (solo INSERT; revocar = fila nueva) | 036 | — | — |
| ai_sessions | Uso de IA en una consulta: autor, modelo, consumo (solo sube) | 036 | — | — |
| ai_drafts | Propuestas de la IA; se aceptan solo con `ai_accept_draft()` (un registro por borrador) o se rechazan, una vez | 036 | 037 | — |
| audit_log | Auditoría de todo cambio; desde 039 encadenada por hash por clínica y sin UPDATE/DELETE | 009 | 014, 015, 024, 025, 029, 030, 034, 039 | — |
| patient_guardians | Responsables del menor; se desactivan con motivo, no se editan | 039 | — | — |
| data_subject_requests | Solicitudes de derechos del titular (Ley 172-13) y su respuesta | 039 | — | — |

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
| `stamp_encounter()` / `check_encounter_link()` | Ciclo de la consulta (no cierra con borradores de IA sin decidir); enlace solo a consulta abierta del mismo paciente | 037 / 035 |
| `ai_consent_active()` / `stamp_ai_*()` | Consentimiento vigente; ciclo de sesiones y borradores de IA | 036 (`stamp_ai_draft` 037) |
| `ai_accept_draft()` / `check_ia_source()` | Acepta un borrador creando su registro, todo o nada; `source = 'ia_confirmada'` solo por esa vía | 037 |
| `create_prescription()` | Crea receta con sus medicamentos (consulta opcional) | 037 |
| `register_procedure()` | Hallazgo + procedimiento realizado + ítem del plan completado, en un paso | 038 |
| `stamp_procedure_performed()` / `procedure_performed_effects()` | Autor, enlaces y anulación del procedimiento; completar ítem y anular hallazgo | 038 |
| `platform_*()` | Alta y activación de clínicas | 030 |
| `audit_chain()` / `audit_verify_chain()` | Encadena cada evento de auditoría; verifica la cadena (admin o plataforma) | 039 |


## Estado en producción

- Aplicadas: 001–004 y 007–039. **No ejecutar 005 ni 006** (ver aviso en cada archivo).
- Toda migración nueva viaja con su prueba en `supabase/tests/` y su línea aquí; lo comprueban el hook de commit y la CI (`scripts/check-migraciones.mjs`).
- Mientras una migración agrupada no esté en producción, se edita en vez de crear otra.
- Antes de escribir una migración, revisar además el esquema real de producción (solo lectura).

Historial de aplicación:
- 028 (`appointments_no_overlap`): aplicada el 2026-10-04 antes que 025; el archivo se agregó después.
- 029 (multi-tenant) y 030 (plataforma): 2026-10-09 desde el SQL Editor, porque `apply_migration` se cuelga con operaciones destructivas.
- 031 (MFA en la base) y 032 (huella/WebAuthn como segundo paso, sin efecto mientras no haya huellas): 2026-10-11.
- 033 (el paciente de un registro no se puede cambiar) y 034 (endurecimiento tras la auditoría: MFA de plataforma, autor y fecha de pacientes y citas, TRUNCATE bloqueado, sin borrado en cascada, cobros del doctor solo de sus pacientes): 2026-10-16 desde el SQL Editor, verificadas.
- 035 (consultas: `encounters` y `encounter_id` en notas, odontograma, signos vitales y recetas): 2026-10-16.
- 036 (IA: `ai_consents`, `ai_sessions`, `ai_drafts`, `source`), 037 (IA: `ai_accept_draft()`, `ia_confirmada` solo por esa vía, consulta no cierra con borradores pendientes, `create_prescription` con consulta) y 038 (`procedures_performed`, `register_procedure()`): 2026-10-17, registradas y verificadas.
- 039 (auditoría encadenada, `patient_guardians`, `data_subject_requests`): aplicada el 2026-10-17 desde el SQL Editor, registrada y verificada (tablas, triggers, RLS, sin DELETE). Lo siguiente va en una migración nueva (040).
