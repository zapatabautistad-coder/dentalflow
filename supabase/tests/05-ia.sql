begin;

select plan(17);

create temp table df_ids (doctor_a uuid, asistente_a uuid, recepcion_a uuid, admin_a uuid,
  patient_a uuid, patient_b uuid, enc uuid, ses uuid, draft_nota uuid, draft_signos uuid);
grant select, update on df_ids to authenticated;
insert into df_ids (doctor_a, asistente_a, recepcion_a, admin_a, patient_a, patient_b)
select (select id from auth.users where email = 'doctor@e2e.test'),
       (select id from auth.users where email = 'enfermeria@e2e.test'),
       (select id from auth.users where email = 'recepcion@e2e.test'),
       (select id from auth.users where email = 'admin@e2e.test'),
       gen_random_uuid(), gen_random_uuid();

set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente prueba 036 A', 936001,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente prueba 036 B', 936002,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
-- El doctor ve al paciente A por tener una cita con él.
insert into public.appointments (patient_id, doctor_id, starts_at, clinic_id)
select patient_a, doctor_a, now(), (select clinic_id from public.patients where id = patient_a) from df_ids;
set local session_replication_role = default;

create function pg_temp.df_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;

set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));
insert into public.encounters (patient_id) select patient_a from df_ids;
reset role;
update df_ids set enc = (select id from public.encounters where patient_id = (select patient_a from df_ids));
set local role authenticated;

-- Sin consentimiento no hay sesión de IA.
select throws_ok(
  $$insert into public.ai_sessions (encounter_id, patient_id, model) select enc, patient_a, 'claude-opus-5-5' from df_ids$$,
  'P0001', 'El paciente no ha dado consentimiento para procesamiento con IA.', 'sin consentimiento no hay sesión');

-- Recepción registra el consentimiento; autor lo pone la base.
select pg_temp.df_as((select recepcion_a from df_ids));
select lives_ok(
  $$insert into public.ai_consents (patient_id, scope, granted, recorded_by)
    select patient_a, 'procesamiento_ia', true, gen_random_uuid() from df_ids$$,
  'recepción registra consentimiento');
select is(
  (select recorded_by from public.ai_consents where patient_id = (select patient_a from df_ids)),
  (select recepcion_a from df_ids), 'autor del consentimiento lo pone la base');
select throws_ok(
  $$insert into public.ai_sessions (encounter_id, patient_id, model) select enc, patient_a, 'claude-opus-5-5' from df_ids$$,
  '42501', null, 'recepción no inicia sesiones de IA');

-- El asistente inicia sesión; el consumo inicial lo pone la base.
select pg_temp.df_as((select asistente_a from df_ids));
select lives_ok(
  $$insert into public.ai_sessions (encounter_id, patient_id, model, input_tokens, cost_usd)
    select enc, patient_a, 'claude-opus-5-5', 999, 99 from df_ids$$,
  'el asistente dental inicia sesión de IA');
reset role;
update df_ids set ses = (select id from public.ai_sessions where encounter_id = (select enc from df_ids));
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));

select is(
  (select (user_id = (select asistente_a from df_ids))::text || '|' || input_tokens::text || '|' || cost_usd::text
     from public.ai_sessions where id = (select ses from df_ids)),
  'true|0|0.0000', 'dueño y consumo inicial los pone la base');

select lives_ok(
  $$update public.ai_sessions set input_tokens = 1500, cost_usd = 0.02 where id = (select ses from df_ids)$$,
  'el dueño registra consumo');
select throws_ok(
  $$update public.ai_sessions set input_tokens = 10 where id = (select ses from df_ids)$$,
  'P0001', 'El consumo de una sesión de IA no puede bajar.', 'el consumo no baja');

-- Borradores: en la sesión propia, mismo paciente.
select throws_ok(
  $$insert into public.ai_drafts (session_id, encounter_id, patient_id, kind, payload)
    select ses, enc, patient_b, 'nota', '{}'::jsonb from df_ids$$,
  'P0001', null, 'no hay borrador para otro paciente');
insert into public.ai_drafts (session_id, encounter_id, patient_id, kind, payload)
select ses, enc, patient_a, 'nota', '{"body":"Caries en 16 oclusal"}'::jsonb from df_ids;
insert into public.ai_drafts (session_id, encounter_id, patient_id, kind, payload)
select ses, enc, patient_a, 'signos', '{"heart_rate":70}'::jsonb from df_ids;
reset role;
update df_ids set draft_nota = (select id from public.ai_drafts where kind = 'nota' and session_id = (select ses from df_ids)),
                  draft_signos = (select id from public.ai_drafts where kind = 'signos' and session_id = (select ses from df_ids));
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));

-- El asistente no firma una nota; sí rechaza signos.
select throws_ok(
  $$update public.ai_drafts set status = 'rechazado' where id = (select draft_nota from df_ids)$$,
  'P0001', 'Solo el doctor decide este borrador.', 'el asistente no decide notas');
select lives_ok(
  $$update public.ai_drafts set status = 'rechazado', decision_note = 'mal oído' where id = (select draft_signos from df_ids)$$,
  'el asistente decide signos vitales');

-- El doctor acepta solo con el registro clínico confirmado de la consulta.
select pg_temp.df_as((select doctor_a from df_ids));
-- (037) Se acepta solo con ai_accept_draft(): crea el registro y lo enlaza.
select throws_ok(
  $$update public.ai_drafts set status = 'aceptado' where id = (select draft_nota from df_ids)$$,
  'P0001', 'Un borrador se acepta con ai_accept_draft().', 'aceptar solo con ai_accept_draft');
select throws_ok(
  $$insert into public.clinical_entries (patient_id, kind, body, encounter_id, source)
    select patient_a, 'nota', 'Caries en 16 oclusal', enc, 'ia_confirmada' from df_ids$$,
  'P0001', 'Un registro de la IA solo se crea al aceptar su borrador.', 'sin aceptar no hay registro ia_confirmada');
select lives_ok(
  $$select public.ai_accept_draft(draft_nota) from df_ids$$,
  'el doctor acepta: crea la nota y la enlaza');
select throws_ok(
  $$update public.ai_drafts set status = 'rechazado', accepted_record_id = null where id = (select draft_nota from df_ids)$$,
  'P0001', 'El borrador ya fue decidido y no se modifica.', 'decidido no cambia');

-- Admin ve el consumo, no los borradores.
select pg_temp.df_as((select admin_a from df_ids));
select is(
  (select count(*)::text from public.ai_sessions where id = (select ses from df_ids))
    || (select count(*)::text from public.ai_drafts where session_id = (select ses from df_ids)),
  '10', 'admin ve sesiones pero no borradores');

reset role;
select throws_ok('truncate public.ai_drafts', 'P0001', null, 'TRUNCATE bloqueado en ai_drafts');

select * from finish();
rollback;
