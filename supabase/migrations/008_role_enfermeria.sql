-- =============================================================
-- DentalFlow · Migración 008 · Rol Enfermería
-- Va sola: Postgres no permite usar un valor nuevo de un enum en la
-- misma transacción en que se crea.
-- =============================================================

alter type public.user_role add value if not exists 'enfermeria';
