-- =============================================================
-- DentalFlow · Migración 004 · Número de expediente y seguro
-- Pegar completo en el SQL Editor de Supabase.
-- =============================================================

create type public.insurance_type as enum ('ars', 'privado');

-- record_number: lo genera la base de datos (columna identity), nunca la
-- app. Al agregarla, Postgres numera automáticamente los pacientes que ya
-- existían. GENERATED ALWAYS impide que un insert/update normal (como los
-- de Supabase JS) le asigne o cambie el valor.
alter table public.patients
  add column record_number integer generated always as identity unique,
  add column insurance_type public.insurance_type,
  add column insurance_provider text,
  add column affiliate_number text;

-- Si es ARS, el nombre de la ARS y el número de afiliado son obligatorios;
-- si es privado (o no se ha registrado seguro), deben quedar vacíos.
alter table public.patients
  add constraint patients_insurance_consistency check (
    (insurance_type = 'ars' and insurance_provider is not null and affiliate_number is not null)
    or (insurance_type = 'privado' and insurance_provider is null and affiliate_number is null)
    or insurance_type is null
  );

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
