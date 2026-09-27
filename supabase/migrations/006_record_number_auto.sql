-- =============================================================
-- DentalFlow · Migración 006 · Número de expediente automático
-- Garantiza que cada paciente reciba un record_number único y generado
-- por la base de datos, incluso si la tabla ya existía antes.
-- =============================================================

alter table public.patients
  add column if not exists record_number integer;

-- Si la columna ya existe sin identidad, la convertimos en identity.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'patients'
      and column_name = 'record_number'
      and is_identity = 'NO'
  ) then
    alter table public.patients
      alter column record_number add generated always as identity;
  end if;
end $$;

-- Aseguramos unicidad si la columna ya existe y no tenía índice.
create unique index if not exists patients_record_number_unique
  on public.patients (record_number);

-- Ajusta la secuencia para que no se repita con registros existentes.
do $$
declare
  v_next_value bigint;
begin
  select coalesce(max(record_number), 0) + 1
    into v_next_value
    from public.patients;

  perform setval(pg_get_serial_sequence('public.patients', 'record_number'), v_next_value, false);
end $$;

-- Permisos para autenticados.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
