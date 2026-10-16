begin;

select plan(8);

-- Sin excepciones: también clinic_counters y platform_admins (sin políticas ni
-- permisos de API; solo las usan funciones SECURITY DEFINER) tienen RLS.
select is(
  (select count(*)::integer
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity),
  0,
  'toda tabla pública tiene RLS activado'
);

select is(
  (select count(*)::integer
     from unnest(array[
       'patients', 'appointments', 'queue', 'clinical_entries',
       'odontogram_entries', 'vital_signs', 'prescriptions',
       'prescription_items', 'treatment_plan_items', 'billing_charges',
       'billing_payments', 'patient_medical_history', 'doctor_schedules',
       'doctor_time_off', 'encounters'
     ]) as clinical(table_name)
    where has_table_privilege('authenticated', 'public.' || table_name, 'DELETE')),
  0,
  'ninguna tabla clínica permite DELETE a authenticated'
);

select is(
  (select count(*)::integer
     from unnest(array[
       'patients', 'appointments', 'queue', 'clinical_entries',
       'odontogram_entries', 'vital_signs', 'prescriptions',
       'prescription_items', 'treatment_plan_items', 'billing_charges',
       'billing_payments', 'patient_medical_history', 'doctor_schedules',
       'doctor_time_off', 'encounters'
     ]) as clinical(table_name)
    where has_table_privilege('anon', 'public.' || table_name, 'DELETE')),
  0,
  'ninguna tabla clínica permite DELETE a anon'
);

select is(
  (select count(*)::integer
     from unnest(array[
       'patients', 'appointments', 'queue', 'clinical_entries',
       'odontogram_entries', 'vital_signs', 'prescriptions',
       'prescription_items', 'treatment_plan_items', 'billing_charges',
       'billing_payments', 'patient_medical_history', 'doctor_schedules',
       'doctor_time_off', 'encounters'
     ]) as clinical(table_name)
    where not exists (
      select 1
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = table_name
         and not t.tgisinternal
         and pg_get_triggerdef(t.oid) like '%audit_row%')),
  0,
  'toda tabla clínica tiene auditoría audit_row'
);

select is(
  (select count(*)::integer
     from unnest(array[
       'patients', 'appointments', 'queue', 'clinical_entries',
       'odontogram_entries', 'vital_signs', 'prescriptions',
       'prescription_items', 'treatment_plan_items', 'billing_charges',
       'billing_payments', 'patient_medical_history', 'doctor_schedules',
       'doctor_time_off', 'encounters'
     ]) as clinical(table_name)
    where not exists (
      select 1
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = table_name
         and not p.polpermissive
         and pg_get_expr(p.polqual, p.polrelid) like '%get_my_clinic%')),
  0,
  'toda tabla clínica tiene aislamiento restrictivo por clínica'
);

select is(
  (select count(*)::integer
     from unnest(array['clinical_entries', 'odontogram_entries', 'vital_signs'])
          as immutable(table_name)
    where has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')),
  0,
  'los registros clínicos inmutables no permiten UPDATE'
);

select is(
  (select count(*)::integer
     from unnest(array['prescription_items']) as immutable(table_name)
    where has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')),
  0,
  'los medicamentos de una receta no permiten UPDATE'
);

select is(
  (select count(*)::integer
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (
        not exists (
          select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
           where setting like 'search_path=%')
        or has_function_privilege('anon', p.oid, 'EXECUTE')
      )),
  0,
  'las funciones SECURITY DEFINER fijan search_path y no son ejecutables por anon'
);

select * from finish();
rollback;
