begin;

select plan(9);

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

-- Tablas con datos de una clínica: se detectan solas por la columna clinic_id.
-- Una tabla nueva queda cubierta sin tocar esta prueba; las excepciones se
-- declaran aquí con su motivo.
--   clinic_counters: cerrada (sin permisos de API), solo la usan funciones.
--   audit_log: no se audita a sí misma; es inmutable (ver 08).
-- Una tabla hija sin clinic_id escaparía del radar: toda tabla con patient_id
-- (o que cuelga de otra tabla clínica) debe llevar clinic_id.
select is(
  (select string_agg(c.relname, ', ' order by c.relname)
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and exists (select 1 from pg_attribute a
                   where a.attrelid = c.oid and a.attname = 'patient_id' and not a.attisdropped)
      and not exists (select 1 from pg_attribute a
                       where a.attrelid = c.oid and a.attname = 'clinic_id' and not a.attisdropped)),
  null,
  'toda tabla con patient_id tiene clinic_id'
);

create temp view df_clinic_tables as
select c.oid, c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and exists (select 1 from pg_attribute a
                where a.attrelid = c.oid and a.attname = 'clinic_id' and not a.attisdropped);

select is(
  (select string_agg(relname, ', ' order by relname) from df_clinic_tables
    where has_table_privilege('authenticated', oid, 'DELETE')
       or has_table_privilege('anon', oid, 'DELETE')),
  null,
  'ninguna tabla con datos de clínica permite DELETE a authenticated ni anon'
);

select is(
  (select string_agg(relname, ', ' order by relname) from df_clinic_tables t
    where relname not in ('clinic_counters', 'audit_log')
      and not exists (select 1 from pg_trigger g
                       where g.tgrelid = t.oid and not g.tgisinternal
                         and pg_get_triggerdef(g.oid) like '%audit_row%')),
  null,
  'toda tabla con datos de clínica tiene auditoría audit_row'
);

select is(
  (select string_agg(relname, ', ' order by relname) from df_clinic_tables t
    where relname <> 'clinic_counters'
      and not exists (select 1 from pg_policy p
                       where p.polrelid = t.oid and not p.polpermissive
                         and pg_get_expr(p.polqual, p.polrelid) like '%get_my_clinic%')),
  null,
  'toda tabla con datos de clínica tiene aislamiento restrictivo por clínica'
);

select is(
  (select string_agg(relname, ', ' order by relname) from df_clinic_tables t
    where relname <> 'clinic_counters'
      and not exists (select 1 from pg_trigger g
                       where g.tgrelid = t.oid and not g.tgisinternal
                         and pg_get_triggerdef(g.oid) like '%block_truncate%')),
  null,
  'toda tabla con datos de clínica bloquea TRUNCATE'
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
