-- =============================================================
-- DentalFlow · Migración 013 · Enfermería puede registrar pacientes nuevos
-- Requiere la 010 (política "patients: enfermeria ve pacientes").
-- =============================================================

-- Enfermería ya puede ver pacientes (010); ahora también puede crear la
-- ficha de un paciente nuevo. No puede editarla ni archivarla después
-- (eso sigue siendo solo de admin y recepción, política de la 001).
create policy "patients: enfermeria crea pacientes"
  on public.patients for insert to authenticated
  with check ((select public.get_my_role()) = 'enfermeria');
