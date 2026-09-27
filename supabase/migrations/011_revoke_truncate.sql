-- =============================================================
-- DentalFlow · Migración 011 · Quitar TRUNCATE/TRIGGER/REFERENCES
-- TRUNCATE vacía una tabla completa saltándose RLS y sin disparar la
-- auditoría. Ni anon ni authenticated lo necesitan (tampoco TRIGGER ni
-- REFERENCES). También se quita de los permisos por defecto para que
-- las tablas nuevas no lo hereden.
-- =============================================================

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
