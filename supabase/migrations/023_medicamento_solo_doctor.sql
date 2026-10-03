-- =============================================================
-- DentalFlow · Migración 023 · Medicamentos: solo el doctor
-- DentalFlow es solo dental: el rol `enfermeria` se muestra como
-- "Asistente dental" y la asistente no administra medicamentos.
-- Sigue pudiendo escribir notas y procedimientos en el registro clínico.
-- Las entradas de medicamento ya guardadas no se tocan (nada clínico se borra).
-- =============================================================

drop policy "clinical_entries: registrar" on public.clinical_entries;

create policy "clinical_entries: registrar"
  on public.clinical_entries for insert to authenticated
  with check (
    (select public.get_my_role()) in ('doctor', 'enfermeria')
    and (kind <> 'medicamento' or (select public.get_my_role()) = 'doctor')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );
