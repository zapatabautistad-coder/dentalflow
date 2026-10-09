# Capturas para el portafolio

Solo contra Supabase local, con pacientes ficticios (apellido "Demo"). Nunca contra producción.

1. `npm run test:e2e:setup` (si Docker Hub da 429, bajar la imagen de `mirror.gcr.io/supabase/...` y retaguearla).
2. `docker exec -i $(docker ps --format '{{.Names}}' | grep -m1 supabase_db) psql -U postgres < e2e/portafolio/datos-demo.sql`
3. Compilar y arrancar en el puerto 3100 (ver `e2e/README.md`).
4. `DEMO_IDS='{"maria":"…","jose":"…","receta":"…"}' DEMO_LANG=en node e2e/portafolio/capturas.mjs <carpeta>`
   (ids de `patients` y `prescriptions` en la base local; `DEMO_LANG=es` para español).
