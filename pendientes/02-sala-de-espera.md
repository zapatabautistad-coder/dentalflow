# Sala de espera (Turnos)

**Qué hace:** pantalla de turnos/sala de espera para recepción y doctores.

**Estado de la base:** la tabla `queue` ya existe (creada en `001_mvp.sql`, con RLS para admin/recepción y enfermería ya cubierto en `010_no_delete_archive_enfermeria.sql`). Falta la pantalla en la app.

**Estado:** hecho (pantalla por Copilot; permisos del doctor, horas por la base y auditoría en la migración 014).
