# Tarea: DentalFlow v2 — Panel con diseño vidrioso 3D y herramientas clínicas

Eres el desarrollador de **DentalFlow**, un software real (no un demo) para clínicas dentales. Stack: Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind CSS 4. Trabaja en español conmigo; el código y los comentarios, en inglés.

## 0. Preparación

1. Busca `dentalflow-v2.zip` en `C:\Users\Admin\Downloads\`. Si no está, pregúntame dónde está.
2. Descomprímelo en `C:\Users\Admin\Documents\dentalflow`. Si esa carpeta ya existe, reemplaza sus archivos con los del zip, pero **conserva `node_modules`**.
3. Comprueba que Node sea ≥ 20.9 (`node -v`). Después ejecuta `npm install`.
4. Lee `README.md` y los archivos de `lib/` antes de tocar nada.

## 1. Lo que ya está hecho en el zip (no lo rehagas)

- `lib/data/types.ts`: `Patient` ya tiene `photoUrl`, `medicalAlerts`, `xrays` y `lastCleaning`. `Appointment` ya tiene `teeth` (FDI), `lab` y `consent`. Existen los tipos `ClinicalNote` y `Prescription`, y el snapshot trae `notes` y `prescriptions`.
- `lib/data/sample.ts`: datos de ejemplo con todo lo anterior. La ciudad y la zona horaria cambian según el país de prueba.
- `lib/clinical.ts`: etiquetas de alertas médicas (`alertLabel`), lista de medicamentos (`DRUGS`), `prescriptionWarnings()`, `chairDelays()`, `recallsDue()` y `whatsappLink()`.
- `lib/teeth.ts`: `UPPER`, `LOWER`, `toothLabel(fdi, numbering)` y `parseTeeth(text, numbering)`.
- `lib/session.ts`: `getSession()` devuelve `null` si no hay sesión; `requireSession()` redirige a `/login`. La cookie de sesión de ejemplo es `df_session` y guarda el rol. También está `SAMPLE_USERS`.
- `lib/roles.ts`: nuevo módulo `settings` (Configuración), solo para Admin. Ahora son 10 módulos.
- `lib/i18n.ts`: **todos** los textos ES/EN nuevos ya existen. Úsalos con `t('clave')`. No escribas textos sueltos en los componentes. Si falta alguno, agrégalo al diccionario en los dos idiomas.
- `app/globals.css`: diseño vidrioso 3D ya definido. Clases disponibles: `card`, `glass-pill`, `sidebar-glass`, `nav-active`, `glass-dark`, `ai-card`, `tile-3d`, `tile-3d-dark`, `btn-glass`, `btn-ghost`, `kpi` + `kpi-navy | kpi-aqua | kpi-ocean | kpi-steel`, `seg`, `field` y `dialog-glass`. Colores de Tailwind: `ink`, `ink-2`, `ink-3`, `line`, `surface`, `brand`, `brand-2`, `brand-deep`, `brand-ink`, `aqua`, `aqua-ink`, `ok`, `warn`, `bad`, `info` y `ai`.

Los componentes todavía usan clases y funciones viejas (`sidebar-grad`, `kpi-locked`, `getSession` sin `null`). Por eso **ahora mismo el proyecto no compila**: tu trabajo es terminar la migración.

## 2. Qué construir

### 2.1 Inicio de sesión (modo de ejemplo)
- Crea `app/login/page.tsx`: una tarjeta `card` centrada con el logo (`BrandMark`) y el título `login_title`/`login_sub`. Debajo, 3 cuentas en botones grandes con avatar: Dr. Alvarez (Doctor), Recepción y Administración.
- Crea `app/login/actions.ts` con dos server actions:
  - `signIn(formData)`: guarda el rol en la cookie `df_session` (path `/`, sameSite `lax`, 12 h) y redirige a `/`.
  - `signOut()`: borra la cookie y redirige a `/login`.
- Usa `requireSession()` en `app/(clinic)/layout.tsx` y en todas las páginas de `(clinic)`.

### 2.2 Estructura (vidrio 3D, como la imagen de referencia)
- **Barra lateral** (`sidebar-glass`):
  - Logo y nombre de la clínica arriba.
  - Los 10 módulos. El activo usa `nav-active`, lleva una barra aguamarina a la izquierda y su icono en aguamarina. Los módulos no permitidos van con candado.
  - Agrega el icono de engranaje para Configuración en `components/ui/Icon.tsx`.
  - Un diente de vidrio decorativo al fondo (SVG, `aria-hidden`, opacidad ≤ 0.2) que no tape el texto.
  - Abajo, en este orden: selector de idioma ES/EN; tarjeta del usuario (`glass-dark`) con avatar, nombre o rol y un botón **Cerrar sesión** (formulario con `signOut`); y el panel **Modo de prueba**, que solo aparece con datos de ejemplo e incluye el rol (cambia `df_session` y hace refresh) y el país.
- **Barra superior**: píldoras flotantes `glass-pill`:
  - Buscador.
  - Fecha y horario de la clínica.
  - **Campana** (`tile-3d`, 40 px) con un contador de avisos.
  - **Nueva cita** (`btn-glass`), solo si el rol puede ver Citas.
  - Chip de la clínica: icono `tile-3d` + nombre + `clinic.city`.
  - Quita de aquí el avatar del usuario; ahora vive en la barra lateral.
- **Fondo**: un diente grande de marca de agua en el área principal (`aria-hidden`, opacidad ≤ 0.08, oculto en pantallas menores a `lg`).
- **Móvil**: menú lateral en cajón (el que ya existe). A 390 px de ancho no debe haber scroll horizontal.

### 2.3 Campana de avisos (`components/shell/Notifications.tsx`)
- Es un popover de vidrio: se abre y cierra con clic, con Escape y al hacer clic fuera. Usa `aria-expanded` y devuelve el foco al botón.
- Los avisos se calculan con los datos. Cada uno lleva un icono y un color de estado:
  1. Laboratorio recibido para hoy: `n_labRecv`, color ok.
  2. Laboratorio aún enviado para citas de los próximos 3 días: `n_labSent`, color warn. El "cuándo" usa `todayW`, `tomorrow` o `inDays`.
  3. Consentimiento pendiente en citas de hoy: `n_consent`, color warn.
  4. Citas `Pending` de los próximos 3 días que aún no llegaron: `n_unconf`, con botón **WhatsApp** que usa `whatsappLink(phone, t('waMsg', …))`. Este botón abre WhatsApp con el texto listo; **no dice "enviado"**.
  5. Limpiezas vencidas: `n_recall` con `recallsDue()`, enlazado a `/patients?recall=1`.
  6. Facturas vencidas (`n_over`), **solo para los roles con permiso `billing`**.
- El contador cuenta todos los avisos excepto los de color ok.
- La campana necesita los datos del día. Pásalos desde el Panel o crea un endpoint del servidor, lo que quede más limpio. En páginas sin datos, la campana puede cargarlos con una server action.

### 2.4 Panel
- **Encabezado**: saludo según la hora local de la clínica (`hiMorning` antes de las 12, `hiAfternoon` antes de las 19 y `hiEvening` después) con `user.name ?? roleName()`. Debajo, la línea `summary` con números reales. El aviso `sampleNote` sale solo con datos de ejemplo. **Nada de frases célebres, lemas ni pies de página de relleno.**
- **4 KPIs** (`kpi` + tono), cada uno con icono en `tile-3d-dark` (44 px), etiqueta, valor, detalle y un botón circular de flecha (vidrio, `aria-label` = `openLink`):
  1. Citas de hoy → `/appointments`.
  2. En espera → `/queue`.
  3. Sillones ocupados → `/queue`.
  4. Según el rol. **Doctor:** "Notas por completar", que cuenta las visitas de hoy (turnos `Done` o `In chair` de ese doctor, o de todos si `user.name` es `null`) de pacientes sin nota clínica hoy; la flecha abre el diálogo de nota con el primer paciente pendiente. **Recepción y Admin:** "Pagos pendientes" → `/billing`.
  - **El Doctor nunca ve dinero.** El servidor ya le quita las facturas; mantenlo así. Elimina `KpiLocked`.
- **Sugerencias de IA** (`ai-card`, violeta, conservando "sugerencias, no datos registrados"). Las acciones son botones píldora:
  - Paciente atascado esperando a un doctor ocupado → Reasignar (ya existe).
  - `chairDelays()` → `ai_delay`, con la acción `ai_delayA`: un enlace de WhatsApp al paciente de la siguiente cita de ese doctor usando `waDelay`.
  - Paciente con embarazo registrado y cita de `Whitening` hoy → `ai_preg`, con enlace a la ficha.
  - Etapas de un plan sin cita → `ai_plan`.
  - Facturas vencidas, solo para roles con `billing`.
- **Citas de hoy** (columna izquierda):
  - Cada fila lleva un `PatientAvatar` de 40 px: la foto si hay `photoUrl`; si no, las iniciales sobre un degradado azul marino → aqua-ink, con anillo blanco y sombra 3D.
  - Junto al nombre, el chip del turno.
  - Una fila de insignias:
    - Alergia (roja, ya existe).
    - **Alertas médicas** (ámbar, con icono y `alertLabel`).
    - **Laboratorio** (`labRecv` en ok o `labSent` en warn; el nombre del artículo pasa por `term()`).
    - **Consentimiento** (`consentOk` o `consentPend`).
    - **Radiografías (n)**, como enlace a `/patients?id=…&tab=xrays`, si hay alguna.
  - Una línea con: tratamiento · **pieza N** (`toothOf`/`teethOf` con `toothLabel` según la numeración del país) · doctor · sillón.
  - Botones según el rol:
    - Doctor: **Nota** y **Receta**. Cuando el paciente ya tiene nota hoy, muestra el chip "Nota hecha".
    - Recepción y Admin: **Registrar llegada** (si aplica) y **WhatsApp** en citas `Pending` que aún no llegaron.
    - Todos: **Ficha**.
  - Filtro `Mías / Todas`: la etiqueta es **"Mías"**, no "Más".
- **Sala de espera** (columna derecha):
  - Avatares, alergia y alertas médicas, y la etiqueta "para ti".
  - En los sillones, el chip `overChip` cuando el paciente se pasa del tiempo reservado.
  - El Doctor tiene los botones **Nota** y **Odontograma** en el paciente que está en el sillón. Se mantiene **Finalizar**.
- **Acciones rápidas** (debajo de Citas de hoy, en una fila de 5 o 6 mosaicos con icono `tile-3d`):
  - Doctor: Nota clínica, Receta, Odontograma, Plan de tratamiento y Nueva cita.
  - Recepción: Registrar llegada, Nuevo paciente, Nueva cita, Registrar pago y Odontograma.
  - Admin: lo mismo que Recepción, más Reportes (`/analytics`) y Configuración (`/settings`).

### 2.5 Diálogos (`dialog` nativo con `dialog-glass`, `showModal`, Escape para cerrar)
- **Nota clínica** (`ClinicalNoteDialog`), solo para el rol con permiso `clinical`:
  - Campos: paciente (pacientes de hoy, de la agenda y de la cola), procedimiento (se rellena con el tratamiento de la cita) y piezas (texto que se interpreta con `parseTeeth` según la numeración del país; la etiqueta es `nd_teeth`).
  - Frases rápidas que se añaden al texto. Usa 8, en ES/EN: anestesia infiltrativa, sin complicaciones, indicaciones post-operatorias entregadas, control en 7 días, sangrado controlado, radiografía tomada, paciente toleró bien el procedimiento y se reprograma la siguiente etapa.
  - El área de texto es obligatoria.
  - Al guardar, añade la nota a la lista (en memoria mientras usamos datos de ejemplo) y muestra el aviso `nd_saved`.
- **Receta** (`PrescriptionDialog`), solo para el rol con permiso `clinical`:
  - Primero elige el paciente y muestra arriba su alergia y sus alertas médicas.
  - Los medicamentos de `DRUGS` salen como chips que se activan y desactivan. Cada uno activado muestra sus indicaciones en un campo editable.
  - Muestra `rx_doseNote`.
  - Si `prescriptionWarnings()` devuelve algo, aparece un recuadro rojo con la lista, y no se puede guardar hasta marcar `rx_ack`.
  - Al guardar, muestra el aviso `rx_saved`.
- **Registrar llegada**: el que ya existe, con el estilo nuevo.

### 2.6 Otros
- Odontograma: usa `lib/teeth.ts` (sin duplicar `UPPER`, `LOWER` ni `toothLabel`) y los estilos nuevos. Todo lo demás se queda igual.
- `app/(clinic)/[slug]/page.tsx`: agrega `settings` a los módulos pendientes. La comprobación de permisos sigue en el servidor.
- Actualiza `README.md`: funciones nuevas, inicio de sesión de prueba y la lista de lo que falta (Supabase).

## 3. Reglas que no se rompen

- **Sin dependencias nuevas.** Los iconos son SVG propios en `Icon.tsx`.
- **Accesibilidad:**
  - Todo texto cumple un contraste mínimo de 4.5:1.
  - Ningún texto mide menos de 12 px.
  - Los estados se indican con punto + texto, nunca solo con color.
  - Los botones que son solo icono llevan `aria-label`.
  - El foco debe verse.
  - Se respeta `prefers-reduced-motion`.
- **Colores:** el violeta es **solo** para la IA. El aguamarina nunca va como texto sobre blanco.
- **Nada falso:** no inventes métricas, testimonios ni funciones. WhatsApp abre un mensaje prellenado; no "envía" nada. Las notas y recetas se guardan en memoria hasta que conectemos Supabase, y el código lo dice en un comentario.
- **Permisos en el servidor:** ningún dato de dinero llega al rol Doctor.
- **ES/EN completo:** usa `t()` y `term()` siempre.
- **Cuida el rendimiento:** en `Dashboard`, sin cálculos pesados en cada tic de reloj; usa `useMemo` donde tenga sentido.

## 4. Verificación (obligatoria antes de terminar)

1. `npm run typecheck` sin errores.
2. `npm run build` sin errores.
3. `npm run dev`. Abre http://localhost:3000 y comprueba:
   - Sin sesión, te lleva a `/login`. Entra como **Doctor**.
   - Cuarto KPI = "Notas por completar: 1" (James Okonkwo). Al guardar su nota, pasa a 0.
   - Sugerencias de IA: aparecen el paciente A-03 atascado, el Sillón 1 con retraso (con WhatsApp para Ahmed), el embarazo de Sofia con blanqueamiento y el plan de Maria.
   - Receta para Ahmed Haddad con Ibuprofeno: 2 avisos (alergia y anticoagulado) y no deja guardar sin marcar la casilla. Receta para Maria con Amoxicilina: aviso de alergia a la penicilina.
   - Campana: laboratorio de Lucia recibido; guía de Priya para mañana aún en laboratorio; consentimiento pendiente de Sofia; Priya sin confirmar mañana y Lucia sin confirmar en 2 días, las dos con WhatsApp; 2 limpiezas vencidas. No aparecen facturas.
   - Cambia a **Recepción**: ve Pagos pendientes y facturas vencidas; no ve Nota ni Receta.
   - Cambia a **Admin**: ve Configuración.
   - Cambia el país a **Estados Unidos**: pieza 21 → 9 y pieza 36 → 19 (numeración Universal).
   - Cambia a EN: no queda ningún texto en español.
   - A 390 px de ancho: sin scroll horizontal, y el menú lateral se abre y se cierra con Escape.
   - Cerrar sesión te devuelve a `/login`.
   - La consola del navegador no muestra errores ni avisos de hidratación.
4. Si algo falla, corrígelo y repite.

## 5. Al terminar

Respóndeme **en español y breve**: qué quedó hecho, cómo lo verificaste y cualquier cosa que no pudiste hacer. No me muestres el código completo en el chat.
