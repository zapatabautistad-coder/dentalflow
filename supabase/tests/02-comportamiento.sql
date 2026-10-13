begin;

select plan(16);

-- Ids de la prueba. La tabla temporal es de postgres: authenticated necesita
-- permiso para leerla después de "set local role authenticated".
create temp table df_test_ids (
  admin_a uuid,
  reception_a uuid,
  doctor_a uuid,
  dental_assistant_a uuid,
  clinic_a uuid,
  clinic_b uuid,
  patient_a uuid,
  patient_a2 uuid,
  patient_b uuid,
  entry_a uuid
);
grant select on df_test_ids to authenticated;

insert into df_test_ids
select
  (select id from auth.users where email = 'admin@e2e.test'),
  (select id from auth.users where email = 'recepcion@e2e.test'),
  (select id from auth.users where email = 'doctor@e2e.test'),
  (select id from auth.users where email = 'enfermeria@e2e.test'),
  (select p.clinic_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'admin@e2e.test'),
  (select p.clinic_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'admin-b@e2e.test'),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid();

-- Datos de prueba creados como postgres, sin triggers (fijan clínica y número a
-- mano), y solo dentro de esta transacción (rollback al final).
set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente de prueba A', 910001, clinic_a from df_test_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a2, 'Paciente de prueba A2', 910002, clinic_a from df_test_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente de prueba B', 910003, clinic_b from df_test_ids;
insert into public.clinical_entries (id, patient_id, kind, body, clinic_id)
select entry_a, patient_a, 'nota', 'Entrada de prueba para pgTAP', clinic_a from df_test_ids;
set local session_replication_role = default;

create function pg_temp.df_as(p_user uuid, p_aal text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
$$;

set local role authenticated;

-- ---------- Aislamiento entre clínicas (admin de A) ----------
select pg_temp.df_as((select admin_a from df_test_ids), 'aal2');

select is(
  (select count(*)::integer from public.patients where id = (select patient_a from df_test_ids)),
  1, 'admin de A ve los pacientes de su clínica');

select is(
  (select count(*)::integer from public.patients where id = (select patient_b from df_test_ids)),
  0, 'admin de A no ve pacientes de la clínica B');

select is(
  (select count(*)::integer from public.clinical_entries where patient_id = (select patient_b from df_test_ids)),
  0, 'admin de A no ve registros clínicos de la clínica B');

select lives_ok(
  $$update public.patients set phone = '8095550000' where id = (select patient_a from df_test_ids)$$,
  'control: admin de A sí edita un paciente de su clínica');

select throws_ok(
  $$update public.patients set clinic_id = (select clinic_b from df_test_ids)
     where id = (select patient_a from df_test_ids)$$,
  'P0001', 'La clínica de un registro no se puede cambiar.',
  'la clínica de un registro no se puede cambiar (ni moverlo a otra clínica)');

-- ---------- MFA en la base (031) ----------
select pg_temp.df_as((select admin_a from df_test_ids), 'aal1');

select is(
  (select count(*)::integer from public.patients where id = (select patient_a from df_test_ids)),
  0, 'el mismo admin con aal1 (sin segundo paso) no lee pacientes');

-- ---------- Registro clínico (asistente dental de A) ----------
select pg_temp.df_as((select dental_assistant_a from df_test_ids), 'aal1');

select lives_ok(
  $$insert into public.clinical_entries (patient_id, kind, body)
    select patient_a, 'nota', 'control: nota del asistente' from df_test_ids$$,
  'control: el asistente dental escribe una nota en su clínica');

select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body)
    select patient_b, 'nota', 'intento entre clínicas' from df_test_ids$$,
  '42501', null,
  'el asistente dental no escribe registros de un paciente de otra clínica');

select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body, corrects_entry_id)
    select patient_a, 'nota', 'corrección sin motivo', entry_a from df_test_ids$$,
  '23514', null,
  'una corrección clínica exige motivo');

select throws_ok(
  $$update public.clinical_entries set body = 'cambiado' where id = (select entry_a from df_test_ids)$$,
  '42501', null,
  'el registro clínico no se edita');

select throws_ok(
  $$select public.create_prescription(
      (select patient_a from df_test_ids),
      '[{"medication":"Medicamento de prueba","dose":"1","frequency":"c/8h","duration":"3 días"}]'::jsonb)$$,
  'P0001', 'Solo un doctor activo puede recetar.',
  'el asistente dental no receta medicamentos');

update public.patients set archived_at = now(), archived_reason = 'Prueba pgTAP'
 where id = (select patient_a2 from df_test_ids);

select is(
  (select count(*)::integer from public.patients
    where id = (select patient_a2 from df_test_ids) and archived_at is not null),
  0, 'el asistente dental no archiva pacientes');

-- ---------- Recepción de A ----------
select pg_temp.df_as((select reception_a from df_test_ids), 'aal1');

select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body)
    select patient_a, 'nota', 'recepción no puede escribir' from df_test_ids$$,
  '42501', null,
  'recepción no escribe en clinical_entries');

update public.patients set archived_at = now(), archived_reason = 'Prueba pgTAP'
 where id = (select patient_a2 from df_test_ids);

select is(
  (select count(*)::integer from public.patients
    where id = (select patient_a2 from df_test_ids) and archived_at is not null),
  1, 'recepción archiva un paciente');

select throws_ok(
  $$delete from public.patients where id = (select patient_a2 from df_test_ids)$$,
  '42501', null,
  'los pacientes no se borran: se archivan');

select throws_ok(
  $$delete from public.clinical_entries where id = (select entry_a from df_test_ids)$$,
  '42501', null,
  'los registros clínicos no se borran');

select * from finish();
rollback;
