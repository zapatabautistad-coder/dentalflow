-- Datos de demostración SOLO para la base local (capturas de portafolio).
\set ON_ERROR_STOP on

update public.profiles p set full_name = v.name
from (values ('admin@e2e.test','Admin Demo'), ('recepcion@e2e.test','Carla Demo'),
             ('doctor@e2e.test','Dra. Laura Demo'), ('enfermeria@e2e.test','Luis Demo')) v(email, name)
join auth.users u on u.email = v.email where p.id = u.id;
update public.profiles p set exequatur = 'DEMO-0001' from auth.users u
where u.id = p.id and u.email = 'doctor@e2e.test';

create temp table u as select email, id from auth.users;
grant select on u to authenticated;
create or replace function pg_temp.act(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from pg_temp.u where email = p_email), 'role', 'authenticated')::text, true);
$$;
create or replace function pg_temp.pid(p_name text) returns uuid language sql as $$
  select id from public.patients where full_name = p_name;
$$;
create or replace function pg_temp.doc() returns uuid language sql as $$
  select id from pg_temp.u where email = 'doctor@e2e.test';
$$;

-- Horario (admin)
begin;
select pg_temp.act('admin@e2e.test'); set local role authenticated;
insert into public.doctor_schedules (doctor_id, weekday, start_time, end_time)
select pg_temp.doc(), d, '08:00', '17:00' from generate_series(1, 5) d;
insert into public.doctor_schedules (doctor_id, weekday, start_time, end_time)
values (pg_temp.doc(), 6, '08:00', '12:00');
insert into public.doctor_time_off (doctor_id, starts_on, ends_on, reason)
values (pg_temp.doc(), '2026-10-29', '2026-10-30', 'Congreso odontológico');
commit;

-- Pacientes y citas (recepción)
begin;
select pg_temp.act('recepcion@e2e.test'); set local role authenticated;
insert into public.patients (full_name, birth_date, phone, insurance_type, insurance_provider, affiliate_number) values
  ('María Demo Rodríguez', '1978-03-14', '809-555-0101', 'ars', 'SENASA', 'DEMO-10023'),
  ('José Demo Martínez',   '1990-07-02', '829-555-0102', 'privado', null, null),
  ('Ana Demo Pérez',       '1985-11-21', '849-555-0103', 'ars', 'ARS Humano', 'DEMO-20451'),
  ('Carlos Demo Santos',   '2001-01-09', '809-555-0104', null, null, null),
  ('Lucía Demo Fernández', '1969-05-30', '829-555-0105', 'ars', 'ARS Universal', 'DEMO-30877'),
  ('Pedro Demo Gómez',     '2015-09-12', '809-555-0106', 'privado', null, null);
insert into public.appointments (patient_id, doctor_id, starts_at, duration_minutes, reason, status) values
  (pg_temp.pid('María Demo Rodríguez'), pg_temp.doc(), '2026-10-09 09:00-04', 45, 'Endodoncia molar 36, segunda sesión', 'completada'),
  (pg_temp.pid('José Demo Martínez'),   pg_temp.doc(), '2026-10-09 10:00-04', 30, 'Dolor en muela superior', 'en_curso'),
  (pg_temp.pid('Ana Demo Pérez'),       pg_temp.doc(), '2026-10-09 11:00-04', 30, 'Limpieza y control', 'confirmada'),
  (pg_temp.pid('Carlos Demo Santos'),   pg_temp.doc(), '2026-10-09 14:00-04', 30, 'Evaluación inicial', 'programada'),
  (pg_temp.pid('Pedro Demo Gómez'),     pg_temp.doc(), '2026-10-09 15:00-04', 30, 'Sellantes', 'confirmada'),
  (pg_temp.pid('Lucía Demo Fernández'), pg_temp.doc(), '2026-10-12 09:30-04', 60, 'Corona pieza 46', 'programada'),
  (pg_temp.pid('María Demo Rodríguez'), pg_temp.doc(), '2026-10-13 10:00-04', 45, 'Resina oclusal 16', 'programada'),
  (pg_temp.pid('Ana Demo Pérez'),       pg_temp.doc(), '2026-10-15 16:00-04', 30, 'Control', 'programada');
insert into public.queue (queue_date, patient_id, doctor_id, appointment_id)
select '2026-10-09', a.patient_id, a.doctor_id, a.id from public.appointments a
where a.starts_at::date = '2026-10-09' and a.starts_at < '2026-10-09 14:00-04' order by a.starts_at;
commit;

-- Avance de la sala de espera (recepción)
begin;
select pg_temp.act('recepcion@e2e.test'); set local role authenticated;
update public.queue set status = 'llamado' where patient_id in (pg_temp.pid('María Demo Rodríguez'), pg_temp.pid('José Demo Martínez'));
update public.queue set status = 'en_atencion' where patient_id in (pg_temp.pid('María Demo Rodríguez'), pg_temp.pid('José Demo Martínez'));
update public.queue set status = 'atendido' where patient_id = pg_temp.pid('María Demo Rodríguez');
commit;

-- Antecedentes, odontograma, plan, notas y receta (doctor)
begin;
select pg_temp.act('doctor@e2e.test'); set local role authenticated;
insert into public.patient_medical_history (patient_id, allergy_penicillin, has_hypertension, current_medications)
values (pg_temp.pid('María Demo Rodríguez'), true, true, 'Losartán 50 mg diario');
insert into public.odontogram_entries (patient_id, tooth, surfaces, condition, note) values
  (pg_temp.pid('María Demo Rodríguez'), 16, array['O'], 'caries', null),
  (pg_temp.pid('María Demo Rodríguez'), 26, array['M','O'], 'obturacion', 'Resina antigua en buen estado'),
  (pg_temp.pid('María Demo Rodríguez'), 36, null, 'endodoncia', 'Segunda sesión'),
  (pg_temp.pid('María Demo Rodríguez'), 46, null, 'corona', null),
  (pg_temp.pid('María Demo Rodríguez'), 18, null, 'ausente', null),
  (pg_temp.pid('María Demo Rodríguez'), 38, null, 'extraccion_indicada', 'Tercer molar semi-incluido'),
  (pg_temp.pid('María Demo Rodríguez'), 47, array['O'], 'sellante', null),
  (pg_temp.pid('María Demo Rodríguez'), 24, array['D'], 'caries', null);
insert into public.treatment_plan_items (patient_id, tooth, surfaces, procedure, estimated_cost) values
  (pg_temp.pid('María Demo Rodríguez'), null, null, 'Profilaxis y destartraje', 1800),
  (pg_temp.pid('María Demo Rodríguez'), 36, null, 'Endodoncia molar', 12000),
  (pg_temp.pid('María Demo Rodríguez'), 16, array['O'], 'Resina compuesta', 2500),
  (pg_temp.pid('María Demo Rodríguez'), 24, array['D'], 'Resina compuesta', 2500),
  (pg_temp.pid('María Demo Rodríguez'), 38, null, 'Extracción de tercer molar', 6500);
update public.treatment_plan_items set status = 'en_proceso'
where patient_id = pg_temp.pid('María Demo Rodríguez') and procedure in ('Profilaxis y destartraje', 'Endodoncia molar');
update public.treatment_plan_items set status = 'completado'
where patient_id = pg_temp.pid('María Demo Rodríguez') and procedure = 'Profilaxis y destartraje';
insert into public.clinical_entries (patient_id, kind, body) values
  (pg_temp.pid('María Demo Rodríguez'), 'nota', 'Paciente refiere sensibilidad al frío en zona inferior izquierda. Se continúa endodoncia del 36.'),
  (pg_temp.pid('María Demo Rodríguez'), 'procedimiento', 'Instrumentación y medicación intraconducto del 36. Obturación temporal.');
select public.create_prescription(pg_temp.pid('José Demo Martínez'),
  '[{"medication":"Ibuprofeno 400 mg","dose":"1 tableta","frequency":"Cada 8 horas","duration":"3 días","quantity":"9 tabletas","instructions":"Tomar con comida"},
    {"medication":"Clorhexidina 0.12% enjuague","dose":"15 ml","frequency":"Cada 12 horas","duration":"7 días","quantity":"1 frasco","instructions":"No ingerir"}]'::jsonb,
  'Volver a control en una semana.', null);
commit;

-- Signos vitales (asistente dental)
begin;
select pg_temp.act('enfermeria@e2e.test'); set local role authenticated;
insert into public.vital_signs (patient_id, systolic, diastolic, heart_rate, oxygen_saturation) values
  (pg_temp.pid('María Demo Rodríguez'), 138, 88, 78, 98),
  (pg_temp.pid('José Demo Martínez'), 118, 76, 72, 99);
commit;

-- Cobros y pagos (recepción)
begin;
select pg_temp.act('recepcion@e2e.test'); set local role authenticated;
insert into public.billing_charges (patient_id, treatment_plan_item_id, description, amount, ars_coverage, ars_name, ars_status)
select patient_id, id, procedure, 1800, 1000, 'SENASA', 'reclamado' from public.treatment_plan_items
where patient_id = pg_temp.pid('María Demo Rodríguez') and procedure = 'Profilaxis y destartraje';
insert into public.billing_charges (patient_id, treatment_plan_item_id, description, amount, ars_coverage, ars_name, ars_status)
select patient_id, id, procedure, 12000, 7000, 'SENASA', 'pendiente' from public.treatment_plan_items
where patient_id = pg_temp.pid('María Demo Rodríguez') and procedure = 'Endodoncia molar';
insert into public.billing_payments (patient_id, amount, method, receipt_number) values
  (pg_temp.pid('María Demo Rodríguez'), 800, 'efectivo', 0),
  (pg_temp.pid('María Demo Rodríguez'), 3000, 'tarjeta', 0);
commit;
