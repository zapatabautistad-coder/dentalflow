-- =============================================================
-- DentalFlow · Migración 024 · Índices en claves foráneas
-- Recomendación del asesor de rendimiento de Supabase: índices para las
-- claves foráneas sin índice (autor, anulación, etc.). Solo agrega índices;
-- no cambia datos ni permisos.
-- =============================================================

create index if not exists audit_log_changed_by_idx on public.audit_log (changed_by);
create index if not exists billing_charges_created_by_idx on public.billing_charges (created_by);
create index if not exists billing_charges_voided_by_idx on public.billing_charges (voided_by);
create index if not exists billing_payments_received_by_idx on public.billing_payments (received_by);
create index if not exists billing_payments_voided_by_idx on public.billing_payments (voided_by);
create index if not exists clinical_entries_author_id_idx on public.clinical_entries (author_id);
create index if not exists doctor_schedules_created_by_idx on public.doctor_schedules (created_by);
create index if not exists doctor_schedules_deactivated_by_idx on public.doctor_schedules (deactivated_by);
create index if not exists doctor_time_off_created_by_idx on public.doctor_time_off (created_by);
create index if not exists doctor_time_off_voided_by_idx on public.doctor_time_off (voided_by);
create index if not exists odontogram_entries_author_id_idx on public.odontogram_entries (author_id);
create index if not exists patient_medical_history_updated_by_idx on public.patient_medical_history (updated_by);
create index if not exists patients_archived_by_idx on public.patients (archived_by);
create index if not exists patients_created_by_idx on public.patients (created_by);
create index if not exists profiles_deactivated_by_idx on public.profiles (deactivated_by);
create index if not exists queue_appointment_id_idx on public.queue (appointment_id);
create index if not exists treatment_plan_items_cancelled_by_idx on public.treatment_plan_items (cancelled_by);
create index if not exists treatment_plan_items_completed_by_idx on public.treatment_plan_items (completed_by);
create index if not exists treatment_plan_items_created_by_idx on public.treatment_plan_items (created_by);
