# Multi-tenant (varias clínicas en una sola app) — PRIORIDAD 1

Acordado el 2026-10-08. Ruta del producto: 1) multi-tenant, 2) dictado por voz → odontograma
(la IA propone, el doctor firma), 3) seguimiento de planes con aprobación de recepción,
4) copiloto de radiografías (segunda opinión), 5) visión: gemelo digital/biomecánica.

Hoy DentalFlow es **una base = una clínica** (no hay `clinic_id`). Sin multi-tenant no es SaaS.

## Tareas (una por sesión para ahorrar tokens)
1. **Inventario (solo lectura):** listar en la base real cada tabla, sus políticas RLS, triggers
   y funciones `security definer`; marcar cuáles necesitan `clinic_id`. Entregar tabla corta.
2. **Migración (con OK del usuario):** tabla `clinics`; `clinic_id` en `profiles` y en toda tabla
   clínica/financiera; rellenar con una clínica inicial; `get_my_clinic()` (como `get_my_role()`);
   cada política RLS filtra también por clínica; secuencias por clínica (recibos, expedientes).
   Sin DELETE, con auditoría.
3. **App:** nombre/dirección/teléfono de la clínica desde la base (hoy `src/lib/clinic.ts`);
   crear cuentas dentro de la clínica del admin.
4. **Alta de clínica nueva** (rol de plataforma, fuera del alcance de los admins de clínica).
5. **Pruebas E2E de aislamiento:** dos clínicas; ninguna ve datos de la otra.

## Pendiente aparte
- PR #18 (Recetas) revisado: build, lint y 80 pruebas OK. Falta "publica en producción".
- `028_appointments_no_overlap.sql` está en la rama `claude/gifted-newton-nwaspk` (ya aplicada en la
  base); llevarlo a `main` al publicar.
