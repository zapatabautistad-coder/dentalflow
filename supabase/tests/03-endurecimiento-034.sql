begin;

select plan(6);

create temp table df_ids (admin_a uuid, clinic_a uuid, patient_a uuid);
grant select on df_ids to authenticated;
insert into df_ids
select u.id, p.clinic_id, gen_random_uuid()
  from auth.users u join public.profiles p on p.id = u.id
 where u.email = 'admin@e2e.test';

select throws_ok('truncate public.audit_log', 'P0001', null, 'TRUNCATE bloqueado en audit_log');
select throws_ok('truncate public.clinical_entries cascade', 'P0001', null, 'TRUNCATE bloqueado en clinical_entries');

select is(
  (select count(*)::integer from pg_constraint
    where conname in ('appointments_patient_id_fkey', 'queue_patient_id_fkey', 'profiles_id_fkey')
      and confdeltype = 'r'),
  3, 'citas, turnos y perfiles no se borran en cascada');

select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_a from df_ids), 'role', 'authenticated', 'aal', 'aal2')::text, true);
set local role authenticated;

insert into public.patients (id, full_name, phone, created_by, created_at)
select patient_a, 'Paciente prueba 034', '8095550034', gen_random_uuid(), '2000-01-01' from df_ids;

select is(
  (select created_by from public.patients where id = (select patient_a from df_ids)),
  (select admin_a from df_ids), 'created_by lo pone la base, no el cliente');

select ok(
  (select created_at > now() - interval '1 minute' from public.patients where id = (select patient_a from df_ids)),
  'created_at lo pone la base, no el cliente');

reset role;
select is(
  has_table_privilege('anon', 'public.patients', 'MAINTAIN'), false, 'anon sin MAINTAIN');

select * from finish();
rollback;
