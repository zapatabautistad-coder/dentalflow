begin;

select plan(11);

create temp table df_test_ids (
  admin_a uuid,
  reception_a uuid,
  doctor_a uuid,
  dental_assistant_a uuid,
  admin_b uuid,
  clinic_a uuid,
  clinic_b uuid,
  patient_a uuid,
  patient_b uuid,
  entry_a uuid
);

insert into df_test_ids
select
  (select id from auth.users where email = 'admin@e2e.test'),
  (select id from auth.users where email = 'recepcion@e2e.test'),
  (select id from auth.users where email = 'doctor@e2e.test'),
  (select id from auth.users where email = 'enfermeria@e2e.test'),
  (select id from auth.users where email = 'admin-b@e2e.test'),
  (select p.clinic_id from public.profiles p where p.id = (select id from auth.users where email = 'admin@e2e.test')),
  (select p.clinic_id from public.profiles p where p.id = (select id from auth.users where email = 'admin-b@e2e.test')),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid();

-- Las filas de prueba se crean fuera de la API y solo viven en esta transacción.
-- session_replication_role evita que los sellos de auditoría mezclen fixtures
-- con los datos que esta prueba está verificando.
set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente de prueba Clínica A', 910001, clinic_a from df_test_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente de prueba Clínica B', 910002, clinic_b from df_test_ids;
insert into public.clinical_entries (id, patient_id, kind, body, clinic_id)
select entry_a, patient_a, 'nota', 'Entrada de prueba para pgTAP', clinic_a from df_test_ids;
set local session_replication_role = default;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_a from df_test_ids),
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;

select is(
  (select count(*)::integer from public.patients where id = (select patient_a from df_test_ids)),
  1,
  'un usuario ve los pacientes de su clínica'
);

select is(
  (select count(*)::integer from public.patients where id = (select patient_b from df_test_ids)),
  0,
  'un usuario no ve pacientes de otra clínica'
);

select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body)
    select patient_b, 'nota', 'intento entre clínicas' from df_test_ids$$,
  null,
  null,
  'insertar un registro clínico de otra clínica falla'
);

select throws_ok(
  $$update public.patients set clinic_id = (select clinic_b from df_test_ids)
      where id = (select patient_a from df_test_ids)$$,
  null,
  null,
  'cambiar la clínica de una fila falla'
);

select is(
  (select count(*)::integer
     from public.patients
    where id = (select patient_a from df_test_ids)
      and clinic_id = (select clinic_a from df_test_ids)),
  1,
  'la fila de la clínica A no fue movida'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select doctor_a from df_test_ids),
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);

select is(
  (select count(*)::integer from public.patients),
  0,
  'un doctor con aal1 no lee pacientes cuando MFA es obligatorio'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select reception_a from df_test_ids),
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);

select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body)
    select patient_a, 'nota', 'recepción no puede escribir' from df_test_ids$$,
  null,
  null,
  'recepción no escribe en clinical_entries'
);

update public.patients
   set archived_at = now(), archived_reason = 'Prueba pgTAP'
 where id = (select patient_a from df_test_ids);

select is(
  (select count(*)::integer
     from public.patients
    where id = (select patient_a from df_test_ids)
      and archived_at is not null),
  1,
  'recepción puede archivar un paciente'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select dental_assistant_a from df_test_ids),
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);

select throws_ok(
  $$select public.create_prescription(
      (select patient_a from df_test_ids),
      '[{"medication":"Medicamento de prueba"}]'::jsonb
    )$$,
  null,
  null,
  'el asistente dental no receta medicamentos'
);

select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body, corrects_entry_id)
    select patient_a, 'nota', 'corrección sin motivo', entry_a from df_test_ids$$,
  null,
  null,
  'una corrección clínica exige motivo'
);

select is(
  (select count(*)::integer
     from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name = 'patients'
      and privilege_type = 'DELETE'),
  0,
  'los pacientes no se borran: se archivan'
);

select * from finish();
rollback;
