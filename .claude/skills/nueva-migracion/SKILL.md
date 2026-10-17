---
name: nueva-migracion
description: Escribir o ampliar una migración de Supabase en DentalFlow con todas las piezas obligatorias (RLS, auditoría, GRANT, TRUNCATE, prueba pgTAP y MAPA). Usar siempre antes de crear o editar un archivo en supabase/migrations/.
---

# Nueva migración (o ampliar la agrupada en curso)

No releer migraciones viejas para copiar el patrón: está aquí. Esquema actual: `supabase/schema.sql` y `supabase/MAPA.md`.

## 1. ¿Nueva o la de turno?
- Si en `supabase/MAPA.md` → "Estado en producción" hay una migración agrupada **no aplicada**, se edita esa. No se crea otra.
- Si no, crear `supabase/migrations/NNN_nombre.sql` (siguiente número). Nunca editar una migración ya aplicada.
- Leer la regla del módulo (`.claude/rules/<módulo>.md`) y el esquema real de producción (solo lectura) antes de escribir.

## 2. Prueba primero
Crear o ampliar `supabase/tests/NN-<tema>.sql` (pgTAP, `begin; select plan(n); … select * from finish(); rollback;`). Patrón de datos y roles: copiar el inicio de `supabase/tests/07-procedimientos.sql` (usuarios `*@e2e.test`, `pg_temp.df_as`, `session_replication_role = replica` para preparar datos). Cubrir como mínimo:
- quien sí puede, puede; quien no, recibe error o 0 filas (incluida otra clínica);
- autor y fechas los pone la base aunque el cliente mande otros;
- lo inmutable no se edita ni se borra.
Correr `npm run test:db` y **ver fallar** la prueba antes de escribir la migración.

## 3. Plantilla por tabla nueva
```sql
create table public.<tabla> (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete restrict,
  -- columnas con CHECK de longitud y valores permitidos
  recorded_by uuid references public.profiles (id) on delete restrict,
  recorded_at timestamptz not null default now(),
  clinic_id   uuid not null references public.clinics (id)
);
-- índice por cada FK y por la consulta principal
create index <tabla>_clinic_id_idx on public.<tabla> (clinic_id);

-- autor y fecha por trigger (security invoker, search_path = '')
create or replace function public.stamp_<tabla>() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.recorded_by := auth.uid();
  new.recorded_at := clock_timestamp();
  return new;
end; $$;
revoke all on function public.stamp_<tabla>() from public, anon, authenticated;

create trigger a0_set_clinic_id before insert or update on public.<tabla>
  for each row execute function public.set_clinic_id();
create trigger <tabla>_stamp before insert on public.<tabla>
  for each row execute function public.stamp_<tabla>();
create trigger <tabla>_audit after insert or update or delete on public.<tabla>
  for each row execute function public.audit_row();
create trigger block_truncate before truncate on public.<tabla>
  for each statement execute function public.block_truncate();

alter table public.<tabla> enable row level security;
create policy "aislamiento por clínica" on public.<tabla> as restrictive to authenticated
  using (clinic_id = (select public.get_my_clinic()))
  with check (clinic_id = (select public.get_my_clinic()));
-- políticas por rol: (select public.get_my_role()) in (...) y
-- exists (select 1 from public.patients p where p.id = <tabla>.patient_id)

grant select, insert on public.<tabla> to authenticated;  -- nunca DELETE
```
Funciones `security definer`: siempre `set search_path = ''`, `revoke all … from public, anon` y `grant execute` solo a quien la use.

## 4. Antes de commit
1. `npm run test:e2e:setup`, `npm run test:db` en verde.
2. `npm run db:types` y `npm run db:schema` (la CI falla si no coinciden).
3. Línea en `supabase/MAPA.md` (tabla o función, para qué, número de migración) y, si queda pendiente de aplicar, anotarlo en "Estado en producción".
4. `npm run verify:fast`.
El hook de commit y la CI rechazan la migración sin prueba SQL o sin su número en MAPA.

## 5. Reporte
Verificado (comandos y resultado) · Inferido · Desconocido. La migración la aplica Darys; nunca aplicarla en producción.
