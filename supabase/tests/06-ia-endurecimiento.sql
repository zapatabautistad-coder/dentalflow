begin;

select plan(19);

create temp table df_ids (doctor_a uuid, asistente_a uuid, patient_a uuid, patient_b uuid, enc uuid, ses uuid,
  d_signos uuid, d_signos_mal uuid, d_odonto uuid, d_plan uuid, d_pregunta uuid, d_nota uuid, vs uuid);
grant select, update on df_ids to authenticated;
insert into df_ids (doctor_a, asistente_a, patient_a, patient_b)
select (select id from auth.users where email = 'doctor@e2e.test'),
       (select id from auth.users where email = 'enfermeria@e2e.test'),
       gen_random_uuid(), gen_random_uuid();

set local session_replication_role = replica;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_a, 'Paciente prueba 037 A', 937001,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
insert into public.patients (id, full_name, record_number, clinic_id)
select patient_b, 'Paciente prueba 037 B', 937002,
       (select clinic_id from public.profiles where id = (select doctor_a from df_ids)) from df_ids;
insert into public.appointments (patient_id, doctor_id, starts_at, clinic_id)
select patient_a, doctor_a, now(), (select clinic_id from public.patients where id = patient_a) from df_ids;
update public.profiles set exequatur = 'EX-037' where id = (select doctor_a from df_ids);
set local session_replication_role = default;

create function pg_temp.df_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;

-- Consentimiento, consulta, sesión y borradores (todos del asistente dental).
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));
insert into public.ai_consents (patient_id, scope, granted) select patient_a, 'procesamiento_ia', true from df_ids;
insert into public.encounters (patient_id) select patient_a from df_ids;
reset role;
update df_ids set enc = (select id from public.encounters where patient_id = (select patient_a from df_ids));
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));
insert into public.ai_sessions (encounter_id, patient_id, model) select enc, patient_a, 'claude-opus-5-5' from df_ids;
reset role;
update df_ids set ses = (select id from public.ai_sessions where encounter_id = (select enc from df_ids));
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));
insert into public.ai_drafts (session_id, encounter_id, patient_id, kind, payload)
select ses, enc, patient_a, k::public.ai_draft_kind, p::jsonb
  from df_ids, (values
    ('signos', '{"systolic":120,"diastolic":80,"heart_rate":70,"glucose_mg_dl":null,"oxygen_saturation":null,"note":null,"t":1}'),
    ('signos', '{"systolic":null,"diastolic":null,"heart_rate":70,"glucose_mg_dl":null,"oxygen_saturation":null,"note":null,"t":2}'),
    ('odontograma', '{"tooth":16,"surfaces":["O"],"condition":"caries","note":null}'),
    ('plan', '{"procedure":"Resina compuesta","tooth":16,"surfaces":["O"],"note":null}'),
    ('pregunta', '{"question":"¿El 16 o el 26?"}'),
    ('nota', '{"body":"Paciente refiere dolor al frío"}')) v(k, p);
reset role;
update df_ids set
  d_signos = (select id from public.ai_drafts where session_id = (select ses from df_ids) and payload ->> 't' = '1'),
  d_signos_mal = (select id from public.ai_drafts where session_id = (select ses from df_ids) and payload ->> 't' = '2'),
  d_odonto = (select id from public.ai_drafts where session_id = (select ses from df_ids) and kind = 'odontograma'),
  d_plan = (select id from public.ai_drafts where session_id = (select ses from df_ids) and kind = 'plan'),
  d_pregunta = (select id from public.ai_drafts where session_id = (select ses from df_ids) and kind = 'pregunta'),
  d_nota = (select id from public.ai_drafts where session_id = (select ses from df_ids) and kind = 'nota');
set local role authenticated;

-- La etiqueta 'ia_confirmada' no se pone a mano.
select pg_temp.df_as((select asistente_a from df_ids));
select throws_ok(
  $$insert into public.vital_signs (patient_id, heart_rate, encounter_id, source)
    select patient_a, 70, enc, 'ia_confirmada' from df_ids$$,
  'P0001', 'Un registro de la IA solo se crea al aceptar su borrador.', 'signos ia_confirmada a mano: rechazado');
select pg_temp.df_as((select doctor_a from df_ids));
select throws_ok(
  $$insert into public.odontogram_entries (patient_id, tooth, condition, encounter_id, source)
    select patient_a, 11, 'ausente', enc, 'ia_confirmada' from df_ids$$,
  'P0001', 'Un registro de la IA solo se crea al aceptar su borrador.', 'odontograma ia_confirmada a mano: rechazado');

-- Firma: el asistente dental solo signos vitales.
select pg_temp.df_as((select asistente_a from df_ids));
select throws_ok(
  $$select public.ai_accept_draft(d_nota) from df_ids$$,
  'P0001', 'Solo el doctor decide este borrador.', 'el asistente dental no acepta notas');

-- Aceptar con cambios: registro con lo editado; el borrador conserva lo propuesto.
select lives_ok(
  $$select public.ai_accept_draft(d_signos,
      '{"systolic":120,"diastolic":80,"heart_rate":72,"glucose_mg_dl":null,"oxygen_saturation":null,"note":null}')
    from df_ids$$,
  'el asistente dental acepta signos editados');
select is(
  (select v.source::text || '|' || v.heart_rate || '|' || (v.encounter_id = x.enc)::text || '|' || (v.author_id = x.asistente_a)::text
     || '|' || d.status::text || '|' || d.decision_note || '|' || (d.payload ->> 'heart_rate')
     from public.ai_drafts d join public.vital_signs v on v.id = d.accepted_record_id, df_ids x
    where d.id = x.d_signos),
  'ia_confirmada|72|true|true|aceptado|Editado antes de aceptar|70', 'registro editado y enlazado; borrador intacto');

-- Todo o nada: si el registro no es válido, el borrador sigue propuesto.
select throws_ok(
  $$select public.ai_accept_draft(d_signos_mal, '{"heart_rate":500}') from df_ids$$,
  '23514', null, 'signos fuera de rango: rechazado');
select is(
  (select status::text from public.ai_drafts where id = (select d_signos_mal from df_ids)),
  'propuesto', 'el borrador sigue propuesto tras el error');

-- El doctor acepta hallazgo y plan.
select pg_temp.df_as((select doctor_a from df_ids));
select lives_ok($$select public.ai_accept_draft(d_odonto) from df_ids$$, 'el doctor acepta un hallazgo');
select is(
  (select o.condition::text || '|' || o.surfaces::text || '|' || o.source::text
     from public.ai_drafts d join public.odontogram_entries o on o.id = d.accepted_record_id
    where d.id = (select d_odonto from df_ids)),
  'caries|{O}|ia_confirmada', 'hallazgo creado desde el borrador');
select lives_ok($$select public.ai_accept_draft(d_plan) from df_ids$$, 'el doctor acepta un ítem del plan');
select is(
  (select t.procedure || '|' || t.tooth || '|' || t.status::text
     from public.ai_drafts d join public.treatment_plan_items t on t.id = d.accepted_record_id
    where d.id = (select d_plan from df_ids)),
  'Resina compuesta|16|pendiente', 'ítem del plan creado desde el borrador');
select throws_ok(
  $$select public.ai_accept_draft(d_odonto) from df_ids$$,
  'P0001', 'El borrador ya fue decidido y no se modifica.', 'no se acepta dos veces');

-- Recetas en la consulta.
-- Fuera de lives_ok: los medicamentos solo se agregan en la transacción que crea la receta
-- (stamp_prescription_item compara xmin) y lives_ok corre en una subtransacción.
select public.create_prescription(p_patient_id => patient_a, p_items => '[{"medication":"Amoxicilina 500 mg"}]',
  p_encounter_id => enc) from df_ids;
select is(
  (select count(*)::integer from public.prescriptions
    where encounter_id = (select enc from df_ids) and patient_id = (select patient_a from df_ids)),
  1, 'la receta queda enlazada a la consulta');
select throws_ok(
  $$select public.create_prescription(p_patient_id => patient_b, p_items => '[{"medication":"Amoxicilina 500 mg"}]',
      p_encounter_id => enc) from df_ids$$,
  'P0001', 'La consulta no es de este paciente.', 'receta: consulta de otro paciente rechazada');

-- No se cierra con borradores sin decidir.
select throws_ok(
  $$update public.encounters set status = 'cerrada' where id = (select enc from df_ids)$$,
  'P0001', 'La consulta tiene borradores de la IA sin decidir: acéptalos o recházalos antes de cerrarla.',
  'consulta con borradores pendientes no se cierra');
select is(
  (select public.ai_accept_draft(d_pregunta) is null from df_ids), true, 'aceptar una pregunta no crea registro');
update public.ai_drafts set status = 'rechazado'
 where id in ((select d_nota from df_ids), (select d_signos_mal from df_ids));
select lives_ok(
  $$update public.encounters set status = 'cerrada' where id = (select enc from df_ids)$$,
  'sin borradores pendientes, la consulta se cierra');

-- Una toma de signos admite una sola corrección.
select pg_temp.df_as((select asistente_a from df_ids));
insert into public.vital_signs (patient_id, heart_rate) select patient_a, 80 from df_ids;
reset role;
update df_ids set vs = (select id from public.vital_signs where patient_id = (select patient_a from df_ids) and heart_rate = 80);
set local role authenticated;
select pg_temp.df_as((select asistente_a from df_ids));
insert into public.vital_signs (patient_id, heart_rate, corrects_entry_id, correction_reason)
select patient_a, 82, vs, 'Error de lectura' from df_ids;
select throws_ok(
  $$insert into public.vital_signs (patient_id, heart_rate, corrects_entry_id, correction_reason)
    select patient_a, 84, vs, 'Otra corrección' from df_ids$$,
  '23505', null, 'una toma de signos admite una sola corrección');

reset role;
select is(
  (select count(*)::integer from pg_indexes
    where schemaname = 'public' and indexname in ('ai_drafts_one_per_record', 'vital_signs_one_correction')
      and indexdef like 'CREATE UNIQUE INDEX%'),
  2, 'un registro respalda un solo borrador (índice único)');

select * from finish();
rollback;
