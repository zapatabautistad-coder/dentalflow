-- =============================================================
-- DentalFlow · Migración 017 · Panel: pacientes para revisión en una consulta
--
-- Problema: el Panel recorría TODO el historial de citas completadas,
-- página por página y con 2 consultas extra por página, hasta juntar
-- 8 pacientes. Con miles de citas eso crecía sin límite en cada carga.
--
-- Solución: una función de lectura que devuelve directamente los
-- pacientes pendientes de revisión, con la MISMA regla que usaba la app:
-- - Tiene al menos una cita "completada" antes del corte (p_cutoff).
--   "Última visita" = la más reciente de esas citas.
-- - No está archivado.
-- - No tiene ninguna cita "completada" desde el corte en adelante.
-- - No tiene citas "programada" o "confirmada" después de p_now.
-- - Orden: última visita más reciente primero; máximo p_limit (8).
--
-- SECURITY INVOKER: corre con la RLS de quien la llama; solo ve las
-- citas y pacientes que ya podía ver con las consultas anteriores.
-- Solo lectura (STABLE): no cambia datos, no afecta auditoría.
--
-- Segura de re-ejecutar: CREATE OR REPLACE + IF NOT EXISTS.
-- =============================================================

-- Índice parcial para agrupar y buscar citas completadas por paciente.
create index if not exists appointments_completed_patient_starts_idx
  on public.appointments (patient_id, starts_at)
  where status = 'completada';

create or replace function public.patients_for_review(
  p_cutoff timestamptz,
  p_now timestamptz,
  p_limit integer default 8
)
returns table (
  patient_id uuid,
  full_name text,
  phone text,
  last_visit timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.full_name, p.phone, lv.last_visit
    from (
      select a.patient_id, max(a.starts_at) as last_visit
        from public.appointments a
       where a.status = 'completada'
         and a.starts_at < p_cutoff
       group by a.patient_id
    ) lv
    join public.patients p
      on p.id = lv.patient_id
     and p.archived_at is null
   where not exists (
           select 1
             from public.appointments r
            where r.patient_id = lv.patient_id
              and r.status = 'completada'
              and r.starts_at >= p_cutoff
         )
     and not exists (
           select 1
             from public.appointments u
            where u.patient_id = lv.patient_id
              and u.status in ('programada', 'confirmada')
              and u.starts_at > p_now
         )
   order by lv.last_visit desc, p.id
   limit least(greatest(coalesce(p_limit, 8), 1), 50);
$$;

-- Solo usuarios con sesión; nadie anónimo.
revoke execute on function public.patients_for_review(timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.patients_for_review(timestamptz, timestamptz, integer) to authenticated;
