# Imagen principal de DentalFlow (hero)

Laptop con el Panel, teléfono delante con el odontograma móvil y el diente de cristal
(`public/dentalflow-mark-sky.png`, a su tamaño nativo para que no pierda nitidez) sobre una base de cristal
transparente con "DentalFlow · Clinical OS" grabado, todo sobre una mesa de vidrio.

| Archivo (3840×2160) | Uso |
| --- | --- |
| `DentalFlow-hero-4K-en.png` / `-es.png` | Imagen completa con texto: venta, redes, presentaciones. |
| `DentalFlow-hero-web-4K-en.png` / `-es.png` | Portada de la página web: sin texto. El texto va en HTML encima (zona libre arriba a la derecha), con las cadenas de `hero-text.js`, para que se traduzca. |

- Las pantallas de la app cambian con el idioma (capturas `hero_*_en.png` con la app en inglés y datos de demostración en inglés).
- Los textos están solo en `hero-text.js` (ES y EN, los dos idiomas de DentalFlow). Para cambiarlos, editar ahí y exportar de nuevo.
- Los tres avisos de seguridad (registro firmado y auditado, verificación en dos pasos, respaldo cifrado
  cada noche) son funciones reales; no agregar certificaciones ni métricas.
- Las pantallas tienen **datos de demostración** de Supabase local (nunca de producción); por eso la imagen con texto
  lleva el aviso "Pantallas con datos de demostración" / "Screens show demo data". En la web ese aviso va en HTML.
- No decir "hecho para República Dominicana" (objetivo global, ver CLAUDE.md).

## Editar
- Composición y posiciones: `hero.html` (lienzo de 1920×1080, se exporta al doble). Se abre con
  `?lang=es|en` y `?text=0` para la versión sin texto.
- Exportar las cuatro versiones: `NODE_PATH=$PWD/node_modules node docs/marketing/hero/hero_render.cjs`
  (Chromium en `/opt/pw-browsers/chromium`, fuentes Inter en `/usr/share/fonts/opentype/inter/`).

## Rehacer las capturas de la app (solo Supabase local)
Se hace una vez por idioma (`HERO_LANG=en` para inglés; sin la variable, español).
1. `npm run test:e2e:setup` (reinicia la base local), luego `set -a; . ./.env.e2e; set +a`.
   Si Docker Hub responde 429 al descargar las imágenes de Supabase, bajarlas de `mirror.gcr.io` y etiquetarlas
   con el nombre original (p. ej. `docker pull mirror.gcr.io/library/kong:2.8.1 && docker tag mirror.gcr.io/library/kong:2.8.1 kong:2.8.1`).
2. Datos de demostración: `HERO_LANG=en NODE_PATH=$PWD/node_modules node docs/marketing/hero/seed.cjs docs/marketing/hero/mfa.json docs/marketing/hero/ids.json`
   (nombres de demostración —Carlos Rosario, Dra./Dr. Laura Méndez, Clínica Dental Sonrisa Clara / Bright Smile Dental—,
   pacientes, citas con dos ya completadas, sala de espera, odontograma, plan y cobros ficticios; activa TOTP de admin y doctor).
3. `npm run build && npx next start -p 3100`.
4. `HERO_LANG=en NODE_PATH=$PWD/node_modules node docs/marketing/hero/hero_shots.cjs` → `hero_desktop_en.png` (2880×1800)
   y `hero_mobile_en.png` (1290×2796); en español, `hero_desktop.png` y `hero_mobile.png`.
