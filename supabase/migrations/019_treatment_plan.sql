-- =============================================================
-- DentalFlow · Migración 019 · Plan de tratamiento
-- Cada procedimiento planificado (diente opcional, costo estimado en RD$)
-- avanza por estados: pendiente → en_proceso → completado, o cancelado
-- (con motivo). Nada se borra (sin DELETE). Solo cambia el estado; el
-- resto queda como se registró. Quién y cuándo (creó, completó, canceló)
-- lo pone la base de datos. Registra y cambia estados solo el doctor;
-- todos los roles leen (recepción necesita los costos).
-- =============================================================

create type public.treatment_status as enum ('pendiente', 'en_proceso', 'completado', 'cancelado');

create table public.treatment_plan_items (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients (id) on delete restrict,

  -- Diente FDI opcional (una limpieza general no lleva diente).
  tooth               smallint check (
    tooth is null
    or (tooth / 10 between 1 and 4 and tooth % 10 between 1 and 8)
    or (tooth / 10 between 5 and 8 and tooth % 10 between 1 and 5)
  ),
  surfaces            text[] check (
    surfaces is null
    or (cardinality(surfaces) between 1 and 5 and surfaces <@ array['M', 'D', 'O', 'V', 'L'])
  ),
  procedure           text not null check (length(trim(procedure)) between 2 and 200),
  estimated_cost      numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0),
  note                text check (note is null or length(note) <= 500),

  status              public.treatment_status not null default 'pendiente',
  cancel_reason       text check (cancel_reason is null or length(cancel_reason) <= 500),

  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz,
  completed_by        uuid references public.profiles (id) on delete set null,
  cancelled_at        timestamptz,
  cancelled_by        uuid references public.profiles (id) on delete set null,

  constraint treatment_plan_items_surfaces check (surfaces is null or tooth is not null),
  constraint treatment_plan_items_cancel check (
    (status <> 'cancelado' and cancel_reason is null)
    or (status = 'cancelado' and length(trim(coalesce(cancel_reason, ''))) >= 5)
  )
);

create index treatment_plan_items_patient_idx
  on public.treatment_plan_items (patient_id, created_at);

create or replace function public.stamp_treatment_plan_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status = 'pendiente';
    new.cancel_reason = null;
    new.created_by = auth.uid();
    new.created_at = now();
    new.started_at = null;
    new.completed_at = null;
    new.completed_by = null;
    new.cancelled_at = null;
    new.cancelled_by = null;
    return new;
  end if;

  -- Lo registrado no cambia: solo el estado (y el motivo al cancelar).
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.tooth is distinct from old.tooth
     or new.surfaces is distinct from old.surfaces
     or new.procedure is distinct from old.procedure
     or new.estimated_cost is distinct from old.estimated_cost
     or new.note is distinct from old.note then
    raise exception 'Solo se puede cambiar el estado del procedimiento.';
  end if;

  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.started_at = old.started_at;
  new.completed_at = old.completed_at;
  new.completed_by = old.completed_by;
  new.cancelled_at = old.cancelled_at;
  new.cancelled_by = old.cancelled_by;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'pendiente' and new.status in ('en_proceso', 'completado', 'cancelado'))
      or (old.status = 'en_proceso' and new.status in ('completado', 'cancelado'))
    ) then
      raise exception 'Cambio de estado no permitido: % → %.', old.status, new.status;
    end if;

    if new.status = 'en_proceso' then
      new.started_at = now();
    elsif new.status = 'completado' then
      new.started_at = coalesce(old.started_at, now());
      new.completed_at = now();
      new.completed_by = auth.uid();
    elsif new.status = 'cancelado' then
      new.cancelled_at = now();
      new.cancelled_by = auth.uid();
    end if;
  else
    new.cancel_reason = old.cancel_reason;
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_treatment_plan_item() from public, anon, authenticated;

create trigger treatment_plan_items_stamp
  before insert or update on public.treatment_plan_items
  for each row execute function public.stamp_treatment_plan_item();

create trigger treatment_plan_items_audit
  after insert or update or delete on public.treatment_plan_items
  for each row execute function public.audit_row();

alter table public.treatment_plan_items enable row level security;

create policy "treatment_plan_items: ver"
  on public.treatment_plan_items for select to authenticated
  using (
    (select public.get_my_role()) in ('admin', 'recepcion', 'doctor', 'enfermeria')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "treatment_plan_items: doctor registra"
  on public.treatment_plan_items for insert to authenticated
  with check (
    (select public.get_my_role()) = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id)
  );

create policy "treatment_plan_items: doctor cambia estado"
  on public.treatment_plan_items for update to authenticated
  using ((select public.get_my_role()) = 'doctor')
  with check ((select public.get_my_role()) = 'doctor');

-- Sin DELETE: un procedimiento se cancela con motivo.
grant select, insert, update on public.treatment_plan_items to authenticated;
