begin;

select plan(22);

create temp table df_ids (doctor_a uuid, asistente_a uuid, recepcion_a uuid, patient_a uuid, patient_b uuid,
  enc uuid, plan_resina uuid, plan_corona uuid, plan_cancelado uuid, plan_otro uuid, proc_resina uuid, hallazgo uuid);
grant select, update on df_ids to authenticated;
insert into df_ids (doctor_a, asistente_a, recepcion_a, patient_a, patient_b, plan_otro)
select (select id from auth.users where email = 'doctor@e2e.test'),
       (select id from auth.users where email = 'enfermeria@e2e.test'),
       (select id from auth.users where email = 'recepcion@e2e.test'),
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid();

set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente prueba 038 A', 938001,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente prueba 038 B', 938002,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
-- El doctor ve a ambos pacientes por tener cita con ellos.
insert into public.appointments (patient_id, doctor_id, starts_at, clinic_id)
select patient_a, doctor_a, now() + interval '1 hour', (select clinic_id from public.patients where id = patient_a) from df_ids;
insert into public.appointments (patient_id, doctor_id, starts_at, clinic_id)
select patient_b, doctor_a, now() + interval '3 hours', (select clinic_id from public.patients where id = patient_b) from df_ids;
insert into public.treatment_plan_items (id, patient_id, procedure, tooth, clinic_id)
select plan_otro, patient_b, 'Extracción simple', 36, (select clinic_id from public.patients where id = patient_b) from df_ids;
set local session_replication_role = default;

create function pg_temp.df_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;

-- Plan del paciente A (lo registra el doctor) y consulta abierta.
set local role authenticated;
select pg_temp.df_as((select doctor_a from df_ids));
insert into public.treatment_plan_items (patient_id, procedure, tooth, surfaces)
select patient_a, 'Resina compuesta', 16, array['O'] from df_ids;
insert into public.treatment_plan_items (patient_id, procedure, tooth)
select patient_a, 'Corona de zirconio', 26 from df_ids;
insert into public.treatment_plan_items (patient_id, procedure)
select patient_a, 'Blanqueamiento' from df_ids;
insert into public.encounters (patient_id) select patient_a from df_ids;
reset role;
update df_ids set
  enc = (select id from public.encounters where patient_id = (select patient_a from df_ids)),
  plan_resina = (select id from public.treatment_plan_items where patient_id = (select patient_a from df_ids) and tooth = 16),
  plan_corona = (select id from public.treatment_plan_items where patient_id = (select patient_a from df_ids) and tooth = 26),
  plan_cancelado = (select id from public.treatment_plan_items where patient_id = (select patient_a from df_ids) and tooth is null);
set local role authenticated;
select pg_temp.df_as((select doctor_a from df_ids));
update public.treatment_plan_items set status = 'cancelado', cancel_reason = 'El paciente no lo quiere'
 where id = (select plan_cancelado from df_ids);

-- Solo el doctor registra.
select pg_temp.df_as((select asistente_a from df_ids));
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_procedure => 'Profilaxis') from df_ids$$,
  'P0001', 'Solo el doctor registra procedimientos realizados.', 'el asistente dental no registra procedimientos');
select pg_temp.df_as((select recepcion_a from df_ids));
select throws_ok(
  $$insert into public.procedures_performed (patient_id, encounter_id, procedure) select patient_a, enc, 'Profilaxis' from df_ids$$,
  '42501', null, 'recepción no registra procedimientos');

-- Del plan, con hallazgo: superficies del procedimiento (MO) en vez de las del plan (O).
select pg_temp.df_as((select doctor_a from df_ids));
select lives_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_treatment_plan_item_id => plan_resina,
      p_surfaces => array['M', 'O'], p_note => 'Anestesia infiltrativa', p_odontogram_condition => 'obturacion')
    from df_ids$$,
  'el doctor registra un procedimiento del plan con su hallazgo');
reset role;
update df_ids set
  proc_resina = (select id from public.procedures_performed where treatment_plan_item_id = (select plan_resina from df_ids)),
  hallazgo = (select odontogram_entry_id from public.procedures_performed where treatment_plan_item_id = (select plan_resina from df_ids));
set local role authenticated;
select pg_temp.df_as((select doctor_a from df_ids));

select is(
  (select procedure || '|' || tooth || '|' || surfaces::text || '|' || (performed_by = (select doctor_a from df_ids))::text
     || '|' || (performed_at > now() - interval '1 minute')::text
     from public.procedures_performed where id = (select proc_resina from df_ids)),
  'Resina compuesta|16|{M,O}|true|true', 'procedimiento y diente del plan; autor y fecha de la base');
select is(
  (select status::text || '|' || (completed_by = (select doctor_a from df_ids))::text
     from public.treatment_plan_items where id = (select plan_resina from df_ids)),
  'completado|true', 'el ítem del plan queda completado por el doctor');
select is(
  (select condition::text || '|' || surfaces::text || '|' || (encounter_id = (select enc from df_ids))::text
     from public.odontogram_entries where id = (select hallazgo from df_ids)),
  'obturacion|{M,O}|true', 'el hallazgo queda en el odontograma de la consulta');

-- Reglas del plan.
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_treatment_plan_item_id => plan_resina) from df_ids$$,
  '23505', null, 'un ítem del plan admite un solo procedimiento vigente');
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_treatment_plan_item_id => plan_corona, p_tooth => 27) from df_ids$$,
  'P0001', 'El diente no coincide con el del plan.', 'el diente no cambia respecto al plan');
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_treatment_plan_item_id => plan_cancelado) from df_ids$$,
  'P0001', 'El procedimiento del plan está cancelado.', 'un ítem cancelado no admite procedimiento');
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_treatment_plan_item_id => plan_otro) from df_ids$$,
  'P0001', 'El procedimiento del plan no es de este paciente.', 'no se usa el plan de otro paciente');

-- Hallazgo de superficie sin superficies: nada se guarda.
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_procedure => 'Resina compuesta', p_tooth => 11,
      p_odontogram_condition => 'obturacion') from df_ids$$,
  'P0001', 'Para esa condición del odontograma faltan las superficies.', 'condición de superficie exige superficies');

-- Sin plan y sin diente.
select lives_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_procedure => 'Profilaxis (limpieza)') from df_ids$$,
  'procedimiento fuera del plan y sin diente');

-- Un hallazgo enlazado debe ser del mismo diente.
select throws_ok(
  $$insert into public.procedures_performed (patient_id, encounter_id, procedure, tooth, odontogram_entry_id)
    select patient_a, enc, 'Resina compuesta', 21, hallazgo from df_ids$$,
  'P0001', 'El hallazgo del odontograma no corresponde a este procedimiento.', 'el hallazgo enlazado es del mismo diente');

-- No se edita; se anula con motivo.
select throws_ok(
  $$update public.procedures_performed set note = 'otra cosa' where id = (select proc_resina from df_ids)$$,
  'P0001', 'Un procedimiento registrado no se edita: anúlalo con motivo y regístralo de nuevo.', 'no se edita');
select throws_ok(
  $$update public.procedures_performed set voided_at = now(), void_reason = 'no' where id = (select proc_resina from df_ids)$$,
  '23514', null, 'anular exige motivo');
select lives_ok(
  $$update public.procedures_performed set voided_at = now(), void_reason = 'Registrado en el diente equivocado'
     where id = (select proc_resina from df_ids)$$,
  'el doctor anula con motivo');
select is(
  (select (voided_by = (select doctor_a from df_ids))::text from public.procedures_performed where id = (select proc_resina from df_ids))
    || '|' || (select count(*)::text from public.odontogram_entries
                where corrects_entry_id = (select hallazgo from df_ids) and condition is null),
  'true|1', 'anular firma al doctor y anula el hallazgo creado');
select throws_ok(
  $$update public.procedures_performed set voided_at = now(), void_reason = 'otra vez anulado'
     where id = (select proc_resina from df_ids)$$,
  'P0001', 'Este procedimiento ya está anulado.', 'se anula una sola vez');
select lives_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_treatment_plan_item_id => plan_resina) from df_ids$$,
  'tras anular, el ítem del plan admite registrarlo de nuevo');

-- Consulta cerrada: no admite procedimientos.
update public.encounters set status = 'cerrada' where id = (select enc from df_ids);
select throws_ok(
  $$select public.register_procedure(p_encounter_id => enc, p_procedure => 'Profilaxis (limpieza)') from df_ids$$,
  'P0001', 'La consulta está cerrada: no admite registros nuevos.', 'consulta cerrada no admite procedimientos');

-- Recepción lee lo realizado (para cobrar).
select pg_temp.df_as((select recepcion_a from df_ids));
select is(
  (select count(*)::integer from public.procedures_performed where patient_id = (select patient_a from df_ids)),
  3, 'recepción ve los procedimientos realizados');

reset role;
select throws_ok('truncate public.procedures_performed', 'P0001', null, 'TRUNCATE bloqueado en procedures_performed');

select * from finish();
rollback;
