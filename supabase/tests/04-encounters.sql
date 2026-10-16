begin;

select plan(11);

create temp table df_ids (doctor_a uuid, asistente_a uuid, recepcion_a uuid, patient_a uuid, patient_b uuid, enc uuid);
grant select, update on df_ids to authenticated;
insert into df_ids
select (select id from auth.users where email = 'doctor@e2e.test'),
       (select id from auth.users where email = 'enfermeria@e2e.test'),
       (select id from auth.users where email = 'recepcion@e2e.test'),
       gen_random_uuid(), gen_random_uuid(), null;

set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente prueba 035 A', 935001,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente prueba 035 B', 935002,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
set local session_replication_role = default;

create function pg_temp.df_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;

set local role authenticated;

-- Recepción no abre consultas.
select pg_temp.df_as((select recepcion_a from df_ids));
select throws_ok(
  $$insert into public.encounters (patient_id) select patient_a from df_ids$$,
  '42501', null, 'recepción no abre consultas');

-- El asistente dental abre; autor y estado los pone la base.
select pg_temp.df_as((select asistente_a from df_ids));
select lives_ok(
  $$insert into public.encounters (patient_id, status, opened_by, opened_at)
    select patient_a, 'cerrada', gen_random_uuid(), '2000-01-01' from df_ids$$,
  'el asistente dental abre una consulta');
reset role;
update df_ids set enc = (select id from public.encounters where patient_id = (select patient_a from df_ids));
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));

select is(
  (select status::text || '|' || (opened_by = (select asistente_a from df_ids))::text
     || '|' || (opened_at > now() - interval '1 minute')::text
     from public.encounters where id = (select enc from df_ids)),
  'abierta|true|true', 'estado, autor y fecha los pone la base');

-- Registro enlazado: mismo paciente sí, otro paciente no.
select lives_ok(
  $$insert into public.clinical_entries (patient_id, kind, body, encounter_id)
    select patient_a, 'nota', 'nota de la consulta', enc from df_ids$$,
  'nota enlazada a la consulta del mismo paciente');
select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body, encounter_id)
    select patient_b, 'nota', 'otro paciente', enc from df_ids$$,
  'P0001', 'La consulta no es de este paciente.', 'no se enlaza a la consulta de otro paciente');

-- El asistente no cierra.
-- Sin política de UPDATE para su rol, la base ignora el cambio (0 filas).
select lives_ok(
  $$update public.encounters set status = 'cerrada' where id = (select enc from df_ids)$$,
  'el asistente dental intenta cerrar');
select is(
  (select status::text from public.encounters where id = (select enc from df_ids)),
  'abierta', 'el asistente dental no cierra consultas: sigue abierta');

-- El doctor cierra (el paciente debe ser suyo: se le da una cita).
reset role;
set local session_replication_role = replica;
insert into public.appointments (patient_id, doctor_id, starts_at, clinic_id)
select patient_a, doctor_a, now(), (select clinic_id from public.patients where id = patient_a) from df_ids;
set local session_replication_role = default;
set local role authenticated;
select pg_temp.df_as((select doctor_a from df_ids));

select throws_ok(
  $$update public.encounters set status = 'cerrada', reason = 'cambiado' where id = (select enc from df_ids)$$,
  'P0001', 'Al cerrar una consulta solo se agrega la nota de cierre.', 'al cerrar no se cambia el motivo');
select lives_ok(
  $$update public.encounters set status = 'cerrada', closure_note = 'Alta' where id = (select enc from df_ids)$$,
  'el doctor cierra la consulta');
select throws_ok(
  $$update public.encounters set closure_note = 'otra' where id = (select enc from df_ids)$$,
  'P0001', 'La consulta ya está cerrada y no se modifica.', 'cerrada no se modifica');
select throws_ok(
  $$insert into public.vital_signs (patient_id, heart_rate, encounter_id)
    select patient_a, 70, enc from df_ids$$,
  'P0001', 'La consulta está cerrada: no admite registros nuevos.', 'consulta cerrada no admite registros');

select * from finish();
rollback;
