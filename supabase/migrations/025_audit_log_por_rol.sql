-- =============================================================
-- DentalFlow · Migración 025 · Auditoría visible según el rol
-- Antes: quien veía a un paciente veía TODO su audit_log, incluidos los
-- cargos y pagos (la asistente dental no tiene acceso a facturación) y las
-- citas/turnos del paciente con otros doctores (el doctor solo ve los suyos).
-- Ahora cada fila de auditoría se ve solo si el rol puede ver la tabla de
-- origen. El admin sigue viendo todo. Solo cambia la política de lectura.
-- =============================================================

-- ALTER POLICY (no drop + create) para cambiar la condición sin dejar ni un
-- instante la tabla sin política.
alter policy "audit_log: ver"
  on public.audit_log
  using (
    (select public.get_my_role()) = 'admin'
    or (
      exists (select 1 from public.patients p where p.id = audit_log.patient_id)
      and case
        when table_name in ('billing_charges', 'billing_payments') then
          (select public.get_my_role()) in ('recepcion', 'doctor')
        when table_name in ('appointments', 'queue') then
          (select public.get_my_role()) in ('recepcion', 'enfermeria')
          or (
            (select public.get_my_role()) = 'doctor'
            and (coalesce(new_data, old_data) ->> 'doctor_id')::uuid = (select auth.uid())
          )
        else true
      end
    )
  );
