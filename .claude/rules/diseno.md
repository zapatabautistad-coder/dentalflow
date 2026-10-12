---
paths:
  - "src/app/globals.css"
  - "src/app/**/sidebar.tsx"
  - "src/app/**/layout.tsx"
  - "src/app/login/**"
  - "src/app/icon.svg"
  - "src/app/apple-icon.png"
  - "src/app/favicon.ico"
  - "public/**"
---
# Diseño: barra lateral, campana, ícono e historial

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Barra lateral: clase `sidebar-crystal` en `src/app/globals.css`. Vidrio esmerilado con el azul vivo arriba que **se desvanece hasta quedar transparente abajo**; menú y logo con texto azul oscuro; la zona inferior (idioma y perfil) en vidrio blanco. En el celular, la barra superior es `topbar-crystal` y el menú abierto `crystal-overlay` (mismo degradado, opaco).
- Botón de notificaciones: clase `bell-glass` (cristal azul translúcido con borde definido y reflejo).
- Ícono principal (decisión de Darys, 2026-10-11): el diente azul de cristal de la imagen de venta (`public/dentalflow-mark-sky.png`, 389×512) sobre el orbe de cristal blanco `crystal-orb` (CSS en `globals.css`, nítido a cualquier tamaño; su brillo va detrás del diente). El diente se sirve ya reducido para cada lugar y densidad de pantalla (`src/app/brand-mark.tsx`, `public/dentalflow-mark-sky-*.png`, en el primer nivel de `public/` porque el proxy no deja pasar subcarpetas sin sesión); si se cambia la imagen o el tamaño del orbe, regenerar con `node scripts/molar-tamanos.mjs`. Se usa en la barra lateral y en el login. En la pestaña del navegador y en el iPhone va una versión simplificada (contorno del diente sobre el orbe blanco): `src/app/icon.svg`, `favicon.ico` y `apple-icon.png`. Si se recolorea una imagen, cambiarle el nombre para no chocar con la caché de imágenes de Next.
- Historial: la versión anterior en azul marino `#154360` + aguamarina `#8FD3C4` está en el commit `aa64a2f`.
