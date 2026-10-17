# Acceso de emergencia (break-glass)

Estado: en pausa. Origen: comparación con el prompt maestro de OrthoLimb (2026-10-17). No entró en la migración 039 porque toca permisos y pantallas, no solo la base.

## Problema
Un doctor solo ve sus pacientes (política "doctor ve sus pacientes"). En una urgencia puede necesitar el expediente de un paciente que no es suyo, dentro de su misma clínica.

## Propuesta
- Tabla `emergency_access` (solo INSERT): doctor, paciente, motivo obligatorio, inicio, vence (p. ej. 4 h), `clinic_id`. Autor y fechas los pone la base; auditada con `audit_row`.
- Función `request_emergency_access(patient, reason)`: solo doctor, mismo `clinic_id`, con MFA (aal2); motivo mínimo 10 caracteres.
- Política adicional de SELECT en tablas clínicas: el doctor ve al paciente si tiene un acceso vigente. Solo lectura; escribir sigue igual.
- Nunca cruza clínicas (la política restrictiva por `clinic_id` se mantiene).
- Aviso al admin de la clínica (campana) y lista "Accesos de emergencia" en Cuentas para revisión posterior.
- Pantalla: botón "Acceso de emergencia" solo en la ficha bloqueada, con diálogo de motivo y aviso de que queda registrado.

## Pendiente de decidir (Darys)
- Duración del acceso y si el asistente dental también puede pedirlo.
- Si el admin debe aprobar después o basta con revisar.
- LEGAL_REVIEW_REQUIRED: uso y conservación del registro según Ley 172-13.

## Cuando se retome
Tabla, función y políticas van en la migración agrupada pendiente (039 mientras no esté aplicada); la pantalla, con prompt para Copilot en `06-prompts-para-agentes.md`.
