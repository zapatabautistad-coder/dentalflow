begin;

select plan(21);

create temp table df_ids (admin_a uuid, recepcion_a uuid, doctor_a uuid, asistente_a uuid,
  admin_b uuid, clinic_a uuid, clinic_b uuid, patient_a uuid, patient_b uuid,
  guardian uuid, dsr uuid);
grant select, update on df_ids to authenticated;
insert into df_ids (admin_a, recepcion_a, doctor_a, asistente_a, admin_b, clinic_a, clinic_b,
  patient_a, patient_b)
select (select id from auth.users where email = 'admin@e2e.test'),
       (select id from auth.users where email = 'recepcion@e2e.test'),
       (select id from auth.users where email = 'doctor@e2e.test'),
       (select id from auth.users where email = 'enfermeria@e2e.test'),
       (select id from auth.users where email = 'admin-b@e2e.test'),
       (select p.clinic_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'admin@e2e.test'),
       (select p.clinic_id from public.profiles p join auth.users u on u.id = p.id where u.email = 'admin-b@e2e.test'),
       gen_random_uuid(), gen_random_uuid();

set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente prueba 039 A', 939001, clinic_a from df_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente prueba 039 B', 939002, clinic_b from df_ids;
set local session_replication_role = default;

create function pg_temp.df_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;

-- ---------- B. Responsables del menor ----------
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));
select throws_ok(
  $$insert into public.patient_guardians (patient_id, full_name, relationship)
    select patient_a, 'Madre Ficticia', 'madre' from df_ids$$,
  '42501', null, 'el asistente dental no registra responsables');

select pg_temp.df_as((select recepcion_a from df_ids));
select lives_ok(
  $$insert into public.patient_guardians (patient_id, full_name, relationship, can_consent, recorded_by, is_active)
    select patient_a, 'Madre Ficticia', 'madre', true, admin_b, false from df_ids$$,
  'recepción registra un responsable');
reset role;
update df_ids set guardian = (select id from public.patient_guardians where patient_id = (select patient_a from df_ids));
set local role authenticated;
select pg_temp.df_as((select recepcion_a from df_ids));

select ok(
  (select recorded_by = (select recepcion_a from df_ids) and is_active
     from public.patient_guardians where id = (select guardian from df_ids)),
  'autor y estado activo los pone la base, no el cliente');

select throws_ok(
  $$update public.patient_guardians set full_name = 'Otro nombre' where id = (select guardian from df_ids)$$,
  'P0001', 'Un responsable no se edita: se desactiva con motivo y se registra otro.',
  'un responsable no se edita');

select throws_ok(
  $$update public.patient_guardians set is_active = false where id = (select guardian from df_ids)$$,
  '23514', null, 'desactivar exige motivo');

select lives_ok(
  $$update public.patient_guardians set is_active = false, ended_reason = 'Cambio de tutor legal',
      ended_at = now() where id = (select guardian from df_ids)$$,
  'se desactiva con motivo');

select ok(
  (select ended_by = (select recepcion_a from df_ids) from public.patient_guardians
    where id = (select guardian from df_ids)),
  'quien desactiva lo pone la base');

select throws_ok(
  $$update public.patient_guardians set is_active = true, ended_reason = null, ended_at = null
     where id = (select guardian from df_ids)$$,
  'P0001', 'Este responsable ya está desactivado.', 'un responsable desactivado no se reactiva');

select pg_temp.df_as((select doctor_a from df_ids));
select is(
  (select count(*)::integer from public.patient_guardians),
  0, 'el doctor no ve responsables de pacientes que no son suyos');

select pg_temp.df_as((select admin_b from df_ids));
select is(
  (select count(*)::integer from public.patient_guardians),
  0, 'otra clínica no ve los responsables');

-- ---------- C. Derechos del titular ----------
select pg_temp.df_as((select recepcion_a from df_ids));
select lives_ok(
  $$insert into public.data_subject_requests (patient_id, request_type, requested_by, channel)
    select patient_a, 'acceso', 'titular', 'presencial' from df_ids$$,
  'recepción registra una solicitud');
reset role;
update df_ids set dsr = (select id from public.data_subject_requests where patient_id = (select patient_a from df_ids));
set local role authenticated;
select pg_temp.df_as((select recepcion_a from df_ids));

select lives_ok(
  $$update public.data_subject_requests set status = 'respondida', response_note = 'x'
     where id = (select dsr from df_ids)$$,
  'recepción intenta responder (la política no le aplica)');
select pg_temp.df_as((select admin_a from df_ids));
select is(
  (select status from public.data_subject_requests where id = (select dsr from df_ids)),
  'recibida', 'la solicitud sigue recibida tras el intento de recepción');

select throws_ok(
  $$update public.data_subject_requests set status = 'respondida' where id = (select dsr from df_ids)$$,
  '23514', null, 'responder exige nota de respuesta');

select lives_ok(
  $$update public.data_subject_requests set status = 'respondida', response_note = 'Copia entregada al titular'
     where id = (select dsr from df_ids)$$,
  'admin responde la solicitud');

select throws_ok(
  $$update public.data_subject_requests set response_note = 'Cambio posterior' where id = (select dsr from df_ids)$$,
  'P0001', 'Una solicitud cerrada no se modifica.', 'una solicitud cerrada no se modifica');

select pg_temp.df_as((select doctor_a from df_ids));
select is(
  (select count(*)::integer from public.data_subject_requests),
  0, 'el doctor no ve solicitudes de derechos');

-- ---------- A. Auditoría encadenada ----------
select pg_temp.df_as((select admin_a from df_ids));
select is(
  (select ok from public.audit_verify_chain()),
  true, 'la cadena de auditoría de la clínica es válida');

select pg_temp.df_as((select admin_b from df_ids));
select throws_ok(
  $$select * from public.audit_verify_chain((select clinic_a from df_ids))$$,
  'P0001', 'No autorizado.', 'un admin no verifica la cadena de otra clínica');
reset role;

select throws_ok(
  $$update public.audit_log set new_data = '{}'::jsonb
     where clinic_id = (select clinic_a from df_ids) and chain_seq is not null$$,
  'P0001', 'audit_log es solo de inserción: no se puede update.',
  'audit_log no se modifica ni con el dueño de la base');

select throws_ok(
  $$delete from public.audit_log where clinic_id = (select clinic_a from df_ids)$$,
  'P0001', 'audit_log es solo de inserción: no se puede delete.',
  'audit_log no se borra ni con el dueño de la base');

select * from finish();
rollback;
