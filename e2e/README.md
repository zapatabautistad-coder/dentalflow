# Pruebas de punta a punta (Playwright)

Corren **solo contra una copia local de Supabase** en Docker: crean pacientes, citas y cobros
que la base no deja borrar, así que nunca se apuntan a producción.

1. `npm run test:e2e:setup` — levanta o reinicia Supabase local con las migraciones de
   producción (sin 005 ni 006), crea un usuario por rol (`<rol>@e2e.test`) y escribe `.env.e2e`.
2. Compilar y arrancar la app con esas variables:
   `set -a; . ./.env.e2e; set +a; npm run build && npx next start -p 3100`
3. En otra terminal: `set -a; . ./.env.e2e; set +a; npm run test:e2e`
   (en la nube: `E2E_CHROMIUM=/opt/pw-browsers/chromium`).

Repetir el paso 1 antes de cada corrida: las pruebas cuentan con una base limpia
(02-sala crea una cita de hoy antes de que 03 cargue el horario del doctor).

`e2e/local/000_plataforma.sql` replica ajustes que Supabase tiene en producción y no están en
las migraciones (RLS automático en tablas nuevas, sin exposición automática de tablas).
