# Imagen principal de DentalFlow (hero)

`DentalFlow-hero-4K.png` (3840×2160): laptop con el Panel, teléfono con el odontograma móvil y
el diente de cristal (`public/dentalflow-mark-sky.png`, a su tamaño nativo para que no pierda nitidez)
sobre una mesa de cristal. Las pantallas tienen **datos de demostración** de Supabase local
(nunca de producción); por eso la imagen lleva el aviso "Pantallas con datos de demostración".
No decir "hecho para República Dominicana" (objetivo global, ver CLAUDE.md).

## Editar
- Composición, textos y posiciones: `hero.html` (lienzo de 1920×1080, se exporta al doble).
- Exportar: `NODE_PATH=$PWD/node_modules node docs/marketing/hero/hero_render.cjs`
  (Chromium en `/opt/pw-browsers/chromium`, fuentes Inter en `/usr/share/fonts/opentype/inter/`).

## Rehacer las capturas de la app (solo Supabase local)
1. `npm run test:e2e:setup`, luego `set -a; . ./.env.e2e; set +a`.
2. Datos de demostración: `NODE_PATH=$PWD/node_modules node docs/marketing/hero/seed.cjs docs/marketing/hero/mfa.json docs/marketing/hero/ids.json`
   (crea pacientes, citas, odontograma, plan y cobros ficticios; activa TOTP de admin y doctor).
3. `npm run build && npx next start -p 3100`.
4. `NODE_PATH=$PWD/node_modules node docs/marketing/hero/hero_shots.cjs` → `hero_desktop.png` (2880×1800) y `hero_mobile.png` (1290×2796).
