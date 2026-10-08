# Inventario para multi-tenant (tarea 1, solo lectura)

Revisado el 2026-10-08 en la base de producción `DENTALFLOW` (`ytoxbvfxjbomqjjshumd`). No se cambió nada.
Hoy: **ninguna tabla tiene `clinic_id`**; todas las políticas filtran solo por `get_my_role()`.

## Tablas (16) — todas con RLS, anon sin acceso

| Tabla | Grants (authenticated) | Necesita `clinic_id` | Nota |
|---|---|---|---|
| profiles | I/S/U | **Sí (raíz)** | De aquí sale `get_my_clinic()`. Hoy "ver" = cualquier rol activo ve todos los perfiles. |
| patients | I/S/U | **Sí** | `record_number` viene de `patients_record_number_seq` global → pasar a consecutivo por clínica. |
| appointments | I/S/U | **Sí** | Triggers de horario y solapamiento (security definer) deben mirar solo la clínica. |
| queue | I/S/U | **Sí** | `assign_queue_position` (security definer, candado por fecha) → candado por clínica+fecha. |
| clinical_entries | I/S | **Sí** | Solo INSERT/SELECT. |
| odontogram_entries | I/S | **Sí** | Solo INSERT/SELECT. |
| vital_signs | I/S | **Sí** | Solo INSERT/SELECT. |
| patient_medical_history | I/S/U | **Sí** | |
| treatment_plan_items | I/S/U | **Sí** | |
| billing_charges | I/S/U | **Sí** | |
| billing_payments | I/S/U | **Sí** | `receipt_number` viene de `billing_receipt_seq` global → recibo consecutivo por clínica. |
| prescriptions | I/S/U | **Sí** | `create_prescription` (invoker) debe tomar la clínica del paciente. |
| prescription_items | I/S | **Sí** (o heredar) | Su política "ver" ya depende de `prescriptions`. |
| doctor_schedules | I/S/U | **Sí** | "ver" = cualquier rol. |
| doctor_time_off | I/S/U | **Sí** | "ver" = cualquier rol. |
| audit_log | S | **Sí** | Política "ver" ya une con `patients`; admin hoy ve todo → debe ser admin **de su clínica**. |

Nadie tiene DELETE ni TRUNCATE. Todas las tablas clínicas ya tienen el trigger `audit_row`.

## Secuencias globales (3)
- `patients_record_number_seq` → expediente por clínica.
- `billing_receipt_seq` → recibo por clínica.
- `audit_log_id_seq` → puede seguir global (solo es id).

## Funciones `security definer` (las que saltan RLS)
| Función | Qué hace | Cambio |
|---|---|---|
| `get_my_role()` | rol del usuario activo (ejecutable por authenticated) | Agregar `get_my_clinic()` igual. |
| `audit_row()` | escribe en `audit_log` | Copiar `clinic_id` de la fila. |
| `assign_queue_position()` | posición del turno | Candado y conteo por clínica. |
| `enforce_appointment_schedule()` | valida horario del doctor | Filtrar por clínica. |
| `enforce_appointment_no_overlap()` | evita citas solapadas | Filtrar por clínica (el doctor ya es de una sola). |
| `handle_new_user()` | crea el perfil al crear usuario en Auth | Debe recibir la clínica (metadatos del alta). |
| `rls_auto_enable()` | event trigger, sin cambio | — |

Sin permiso de ejecución para authenticated (solo se disparan por trigger), salvo `get_my_role`.

## Funciones normales que tocar
`patients_for_review` y `create_prescription` (invoker; heredan RLS, revisar que no mezclen clínicas), triggers `stamp_*` (poner `clinic_id` desde `get_my_clinic()` en INSERT y prohibir cambiarlo).

## Políticas RLS
~40 políticas. Patrón repetido: `get_my_role() = ANY(...)` + `EXISTS (patients ...)`. Con `clinic_id` en `patients`, las tablas hijas quedan aisladas por el `EXISTS`, pero conviene filtrar también por `clinic_id` directo (más rápido y defensa en profundidad). Políticas sin `patients` que **sí o sí** necesitan filtro nuevo: `profiles` (ver y gestionar), `appointments`, `queue`, `doctor_schedules`, `doctor_time_off`, `audit_log` (rama admin), `patients` (admin/recepción/enfermería).

## Hallazgos para la migración
1. Datos actuales: pocos (3 pacientes, 4 perfiles, 4 citas) → rellenar con una "clínica inicial" es trivial.
2. Índices parciales y únicos (cédula, recibo, expediente, cargo vigente por procedimiento) pasan a ser únicos **por clínica**.
3. El código de la app que usa `service role` (`/accounts`) salta RLS: crear usuarios debe fijar la clínica del admin en servidor.
4. `src/lib/clinic.ts` guarda hoy el nombre/dirección/teléfono fijos (tarea 3).
5. Ver `pendientes/10-revision-seguridad.md` antes de la migración (proxy y `audit_log`).

## Siguiente paso
Tarea 2 (migración 029) **necesita tu OK**. Propuesta: `clinics`, `clinic_id NOT NULL` + FK en las 16 tablas, `get_my_clinic()`, políticas reescritas, secuencias por clínica; probar primero en el proyecto `dentalflow-demo`, no en producción.
