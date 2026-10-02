-- =============================================================
-- DentalFlow · Migración 020 · Facturación con ARS
-- Cargos (lo que cuesta cada servicio, cuánto cubre la ARS y cuánto paga el
-- paciente) y pagos del paciente (con número de recibo consecutivo).
-- Nada se borra (sin DELETE): un cargo o pago equivocado se ANULA con motivo.
-- Lo registrado no se edita; solo se anula. Montos, quién y cuándo los
-- valida y sella la base. Registran recepción y admin; el doctor solo ve.
-- Enfermería no tiene acceso a la facturación.
-- =============================================================

create type public.payment_method as enum ('efectivo', 'tarjeta', 'transferencia', 'cheque');
create type public.ars_claim_status as enum ('no_aplica', 'pendiente', 'reclamado', 'pagado', 'rechazado');

create table public.billing_charges (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.patients (id) on delete restrict,
  -- Opcional: el procedimiento del plan que se cobra (una sola vez).
  treatment_plan_item_id  uuid unique references public.treatment_plan_items (id) on delete restrict,
  description             text not null check (length(trim(description)) between 2 and 200),
  amount                  numeric(12, 2) not null check (amount > 0),
  ars_coverage            numeric(12, 2) not null default 0 check (ars_coverage >= 0),
  patient_amount          numeric(12, 2) generated always as (amount - ars_coverage) stored,
  ars_name                text check (ars_name is null or length(ars_name) <= 120),
  ars_authorization       text check (ars_authorization is null or length(ars_authorization) <= 60),
  ars_status              public.ars_claim_status not null default 'no_aplica',

  created_by              uuid references public.profiles (id) on delete set null,
  created_at              timestamptz not null default now(),
  voided_at               timestamptz,
  voided_by               uuid references public.profiles (id) on delete set null,
  void_reason             text check (void_reason is null or length(void_reason) <= 500),

  constraint billing_charges_coverage check (ars_coverage <= amount),
  constraint billing_charges_ars check (
    (ars_coverage = 0 and ars_status = 'no_aplica')
    or (ars_coverage > 0 and ars_status <> 'no_aplica' and length(trim(coalesce(ars_name, ''))) > 0)
  ),
  constraint billing_charges_void check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and length(trim(coalesce(void_reason, ''))) >= 5)
  )
);

create index billing_charges_patient_idx on public.billing_charges (patient_id, created_at);

create sequence public.billing_receipt_seq start 1;

create table public.billing_payments (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients (id) on delete restrict,
  receipt_number  bigint not null unique,
  amount          numeric(12, 2) not null check (amount > 0),
  method          public.payment_method not null,
  reference       text check (reference is null or length(reference) <= 100),
  note            text check (note is null or length(note) <= 500),

  received_by     uuid references public.profiles (id) on delete set null,
  received_at     timestamptz not null default now(),
  voided_at       timestamptz,
  voided_by       uuid references public.profiles (id) on delete set null,
  void_reason     text check (void_reason is null or length(void_reason) <= 500),

  constraint billing_payments_void check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and length(trim(coalesce(void_reason, ''))) >= 5)
  )
);

create index billing_payments_patient_idx on public.billing_payments (patient_id, received_at);

-- ---------- Cargos: sellos, solo anular y avanzar el reclamo a la ARS ----------
create or replace function public.stamp_billing_charge()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plan_patient uuid;
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.created_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    new.ars_status = case when new.ars_coverage > 0 then 'pendiente' else 'no_aplica' end;
    if new.treatment_plan_item_id is not null then
      select patient_id into v_plan_patient
        from public.treatment_plan_items where id = new.treatment_plan_item_id;
      if v_plan_patient is distinct from new.patient_id then
        raise exception 'El procedimiento del plan no es de este paciente.';
      end if;
    end if;
    return new;
  end if;

  -- Lo cobrado no se edita.
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.treatment_plan_item_id is distinct from old.treatment_plan_item_id
     or new.description is distinct from old.description
     or new.amount is distinct from old.amount
     or new.ars_coverage is distinct from old.ars_coverage
     or new.ars_name is distinct from old.ars_name
     or new.ars_authorization is distinct from old.ars_authorization then
    raise exception 'Un cargo registrado no se edita: anúlalo y registra uno nuevo.';
  end if;
  new.created_by = old.created_by;
  new.created_at = old.created_at;

  if old.voided_at is not null then
    raise exception 'Este cargo ya está anulado.';
  end if;

  -- Anular
  if new.voided_at is not null then
    new.voided_at = now();
    new.voided_by = auth.uid();
    new.ars_status = old.ars_status;
    return new;
  end if;
  new.voided_by = null;
  new.void_reason = null;

  -- Reclamo a la ARS: pendiente → reclamado → pagado o rechazado.
  if new.ars_status is distinct from old.ars_status then
    if not (
      (old.ars_status = 'pendiente' and new.ars_status = 'reclamado')
      or (old.ars_status = 'reclamado' and new.ars_status in ('pagado', 'rechazado'))
    ) then
      raise exception 'Cambio de estado de ARS no permitido: % → %.', old.ars_status, new.ars_status;
    end if;
  end if;

  return new;
end;
$$;

-- ---------- Pagos: número de recibo por la base y solo anular ----------
create or replace function public.stamp_billing_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.receipt_number = nextval('public.billing_receipt_seq');
    new.received_by = auth.uid();
    new.received_at = now();
    new.voided_at = null;
    new.voided_by = null;
    new.void_reason = null;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.receipt_number is distinct from old.receipt_number
     or new.amount is distinct from old.amount
     or new.method is distinct from old.method
     or new.reference is distinct from old.reference
     or new.note is distinct from old.note then
    raise exception 'Un pago registrado no se edita: anúlalo y registra uno nuevo.';
  end if;
  new.received_by = old.received_by;
  new.received_at = old.received_at;

  if old.voided_at is not null then
    raise exception 'Este pago ya está anulado.';
  end if;
  if new.voided_at is null then
    raise exception 'Un pago solo se puede anular.';
  end if;
  new.voided_at = now();
  new.voided_by = auth.uid();
  return new;
end;
$$;

revoke execute on function public.stamp_billing_charge() from public, anon, authenticated;
revoke execute on function public.stamp_billing_payment() from public, anon, authenticated;
grant usage on sequence public.billing_receipt_seq to authenticated;

create trigger billing_charges_stamp
  before insert or update on public.billing_charges
  for each row execute function public.stamp_billing_charge();
create trigger billing_payments_stamp
  before insert or update on public.billing_payments
  for each row execute function public.stamp_billing_payment();

create trigger billing_charges_audit
  after insert or update or delete on public.billing_charges
  for each row execute function public.audit_row();
create trigger billing_payments_audit
  after insert or update or delete on public.billing_payments
  for each row execute function public.audit_row();

alter table public.billing_charges enable row level security;
alter table public.billing_payments enable row level security;

create policy "billing_charges: ver"
  on public.billing_charges for select to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion', 'doctor'));
create policy "billing_charges: registrar"
  on public.billing_charges for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );
create policy "billing_charges: anular o reclamar"
  on public.billing_charges for update to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'))
  with check ((select public.get_my_role()) in ('admin', 'recepcion'));

create policy "billing_payments: ver"
  on public.billing_payments for select to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion', 'doctor'));
create policy "billing_payments: registrar"
  on public.billing_payments for insert to authenticated
  with check (
    (select public.get_my_role()) in ('admin', 'recepcion')
    and exists (select 1 from public.patients p where p.id = patient_id)
  );
create policy "billing_payments: anular"
  on public.billing_payments for update to authenticated
  using ((select public.get_my_role()) in ('admin', 'recepcion'))
  with check ((select public.get_my_role()) in ('admin', 'recepcion'));

-- Sin DELETE: un cargo o pago equivocado se anula con motivo.
grant select, insert, update on public.billing_charges to authenticated;
grant select, insert, update on public.billing_payments to authenticated;
