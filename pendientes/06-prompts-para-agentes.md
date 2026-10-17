# Prompts listos para asignar trabajo

**Cómo usarlos:** copia cada prompt tal cual como un Issue de GitHub (o como mensaje al agente). Las tareas de la **Parte A** son acotadas y de bajo riesgo: apropiadas para Copilot. Las de la **Parte B** son complejas o delicadas: van a un agente avanzado, con revisión del dueño del proyecto.

Regla general para todas: se trabaja en una rama y se abre un Pull Request; **nunca push directo a `main`** (`main` se publica solo en producción).

---

## Plantilla obligatoria (desde 2026-10-17)

Todo prompt nuevo para Copilot u otro agente se escribe con esta plantilla. Sin criterios de aceptación ni bloques de aislamiento no se asigna.

```
Lee CLAUDE.md, AGENTS.md y .github/copilot-instructions.md antes de empezar.
Regla del módulo: .claude/rules/<módulo>.md

Objetivo: <una frase>

Criterios de aceptación (Dado / Cuando / Entonces):
- Dado <situación>, cuando <acción>, entonces <resultado verificable>.
- Dado <usuario sin permiso u otra clínica>, cuando <acción>, entonces <se rechaza / no ve nada>.
- Dado que no hay datos, cuando abre la pantalla, entonces ve un estado vacío honesto.

Archivos permitidos (Write):
- <ruta exacta o carpeta>

Archivos de referencia (Read-only):
- Módulo de referencia: recetas (src/app/(app)/patients/[id]/recetas/, src/lib/prescriptions.ts y su prueba, .claude/rules/recetas.md). Copia su estructura: validación, permisos, estados de carga/vacío/error, textos ES/EN.
- <otros archivos que solo debe leer>

Prohibiciones explícitas:
- No tocar supabase/migrations/, políticas RLS, triggers, GRANT, autenticación ni cuentas.
- No borrar ni editar registros clínicos; no agregar botones de borrar.
- No inventar datos, métricas ni textos de ejemplo en pantalla.
- No cambiar diseño (paleta, barra lateral, ícono).
- No tocar archivos fuera de "Archivos permitidos". Si hace falta, dilo en el PR.

Entrega: rama nueva + Pull Request con, por cada criterio, cómo se comprobó.
Antes de terminar: npm run verify:fast en verde y npm run build sin errores.
```

---

## Parte A · Tareas para Copilot

### A1 · Pruebas para las utilidades sin cubrir
```
Lee CLAUDE.md y .github/copilot-instructions.md antes de empezar.

Objetivo: agregar pruebas unitarias (Vitest, `npm test`) para las utilidades que hoy no tienen:
- src/lib/phone.ts
- src/lib/patient-search.ts
- src/lib/auth-roles.ts

Requisitos:
- Un archivo .test.ts junto a cada utilidad, con el estilo de src/lib/cedula.test.ts y src/lib/timezone.test.ts.
- Cubre casos normales, bordes (vacío, null, espacios, mayúsculas/acentos) y entradas inválidas.
- NO cambies el comportamiento de las utilidades. Si encuentras un error real, no lo corrijas en silencio: descríbelo en el PR.
- No inventes datos de pacientes reales; usa valores ficticios claramente de prueba.

No toques: migraciones, base de datos, autenticación, diseño.
Entrega: rama nueva + Pull Request. Antes de terminar, `npm run lint`, `npm test` y `npm run build` deben pasar.
```

### A2 · Paridad de traducciones ES/EN
```
Lee CLAUDE.md y .github/copilot-instructions.md antes de empezar.

Contexto: los textos fijos usan `data-i18n="clave"` y las traducciones viven en src/app/(app)/language-bridge.tsx (objeto TRANSLATIONS con `es` y `en`). Solo se admiten español e inglés.

Objetivo:
1. Escribe una prueba (Vitest) que verifique que TODA clave `data-i18n` usada en src/ existe en `es` y en `en`, y que `es` y `en` tienen exactamente las mismas claves.
2. Si la prueba encuentra claves faltantes, agrega las traducciones que falten (español claro y neutral; inglés natural, sin traducción literal rara).

Reglas:
- `data-i18n` solo en textos fijos, NUNCA en elementos que muestran datos de Supabase (nombres, motivos, notas).
- No cambies textos que ya están bien ni la lógica del selector de idioma.

No toques: migraciones, base de datos, autenticación, diseño.
Entrega: rama nueva + Pull Request. `npm run lint`, `npm test` y `npm run build` deben pasar.
```

### A3 · Estados de carga que faltan
```
Lee CLAUDE.md y .github/copilot-instructions.md antes de empezar.

Objetivo: agregar `loading.tsx` a las secciones que aún no lo tienen: src/app/(app)/waiting-room y src/app/(app)/accounts. Toma como modelo los que ya existen en appointments, panel y patients (misma estructura y estilo visual).

Reglas:
- Solo esqueletos de carga. NUNCA muestres números, nombres ni listas inventadas: solo bloques grises animados.
- Respeta el diseño actual; no cambies colores, barra lateral ni ícono.
- Respeta "reducir movimiento" (prefers-reduced-motion) como hacen los existentes.

No toques: migraciones, base de datos, autenticación.
Entrega: rama nueva + Pull Request. `npm run lint`, `npm test` y `npm run build` deben pasar.
```

### A4 · Revisión de accesibilidad (sin cambios visuales)
```
Lee CLAUDE.md y .github/copilot-instructions.md antes de empezar.

Objetivo: revisar y mejorar la accesibilidad de src/app/(app)/sidebar.tsx (menú, botón de notificaciones y su panel), src/app/login/page.tsx y los formularios de src/app/(app)/patients/.
Busca y corrige: botones e iconos sin `aria-label`, campos sin `<label>` asociado, orden de foco, foco visible, navegación con teclado (Tab/Escape), roles ARIA incorrectos y textos alternativos de imágenes.

Reglas:
- NO cambies el aspecto visual (colores, tamaños, espaciados, ícono, barra lateral). Solo atributos y semántica.
- No cambies el comportamiento de ninguna función.
- Lista en el PR cada hallazgo y cada cambio. Lo que no puedas arreglar sin cambiar el diseño, anótalo sin tocarlo.

No toques: migraciones, base de datos, autenticación.
Entrega: rama nueva + Pull Request. `npm run lint`, `npm test` y `npm run build` deben pasar.
```

### A5 · Documentación de arranque
```
Lee CLAUDE.md y .github/copilot-instructions.md antes de empezar.

Objetivo: reemplazar el README.md por documentación útil para quien recibe el proyecto:
- Qué es DentalFlow (producto real para clínicas) y el stack.
- Cómo correrlo en local (`npm install`, `npm run dev`, `npm test`, `npm run build`).
- Variables de entorno necesarias: SOLO los NOMBRES (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, IDENTITY_API_URL, IDENTITY_API_KEY) y para qué sirve cada una. NUNCA valores ni claves.
- Estructura de carpetas y dónde vive cada cosa.
- Reglas del proyecto en resumen (nada clínico se borra, auditoría, sin datos inventados) apuntando a CLAUDE.md.
- Cómo se despliega (Vercel, publica solo desde `main`).

Reglas: no inventes funciones que no existan ni certificaciones (nada de "HIPAA compliant"). Solo español.
No toques código, migraciones ni configuración.
Entrega: rama nueva + Pull Request.
```

---

## Parte B · Tareas complejas (agente avanzado, con revisión)

**Encabezado común para todas:** «Lee CLAUDE.md, AGENTS.md y pendientes/05-pediatria-y-especialidades.md. Antes de escribir una migración, revisa el esquema REAL de la base con herramientas de solo lectura (nunca solo los archivos). No apliques nada en la base ni en producción: las migraciones se escriben como archivo y las aprueba el dueño. Toda tabla clínica lleva trigger `audit_row`, sin DELETE, GRANT a `authenticated`, autor y fecha por trigger y RLS por rol. Al terminar: `npm run lint`, `npm test`, `npm run build`. Rama nueva + Pull Request, no push a `main`.»

### B1 · Base de especialidades (fase 1)
```
[Encabezado común]

Objetivo: preparar la base de una clínica multiespecialidad.
1. Migración nueva (siguiente número libre) con las tablas `specialties` (código, nombre ES/EN, activa) y `doctor_specialties` (doctor ↔ especialidad), con RLS: todos los roles leen las especialidades; solo admin las administra; cada doctor ve sus asignaciones. Incluye auditoría y sin DELETE (se desactivan, no se borran).
2. Que la cita pueda llevar la especialidad (columna opcional, sin romper las citas existentes).
3. Interfaz: en la administración de cuentas (solo admin), asignar especialidades a un doctor; en el menú, mostrar los módulos de las especialidades del usuario (por ahora solo el enlace, sin pantallas nuevas).
4. Pruebas de la lógica que se pueda probar sin base de datos.

Entrega también una nota con el diseño y los riesgos. No agregues botones ni opciones que no hagan nada.
```

### B2 · Pediatría, versión 1 (después de B1 y de aprobar el diseño)
```
[Encabezado común]

Objetivo: implementar la versión 1 de Pediatría según pendientes/05-pediatria-y-especialidades.md, por PRs pequeños y en este orden:
1. Responsables del menor (`patient_guardians`) y antecedentes de nacimiento.
2. Control de niño sano: `growth_measurements` (peso, talla/longitud, perímetro cefálico, IMC). Solo INSERT y SELECT; las correcciones se hacen con otra fila que apunte a la anterior con motivo, como en `clinical_entries`. Escriben solo doctor y enfermería.
3. Carnet de vacunas: `immunization_records` (solo INSERT/SELECT) contra `immunization_schedule` por país (US y DO), con fuente y versión de cada fila.
4. Gráficas de percentiles con tablas oficiales OMS (menores de 2 años) y CDC (2 años o más) en `growth_reference`.

Reglas críticas:
- NO inventes valores de referencia ni de esquemas de vacunas. Si no puedes confirmar un dato en la fuente oficial (CDC, OMS, Ministerio de Salud Pública de RD), no lo cargues y déjalo marcado como pendiente.
- Fuera de alcance: calculadora de dosis por peso.
- Un pediatra debe revisar plantillas, cálculos y esquemas antes de usarse con niños reales; déjalo escrito en el PR.
```

### B3 · Plantilla de instalación por cliente y configuración por país
```
[Encabezado común]

Objetivo: dejar lista una instancia por cliente (cada clínica con su propia base y sitio) y quitar lo que ata la app a un país.
1. Guía y, si es posible, script para crear una instancia nueva: proyecto de base de datos, aplicar migraciones en orden, variables de entorno, primer usuario admin y despliegue. Sin claves en el repositorio.
2. Configuración por país/clínica: zona horaria, idioma por defecto (es/en), formato de teléfono, tipo de documento de identidad (la cédula dominicana solo donde aplique) y moneda. Que hoy nada cambie para República Dominicana.
3. Pruebas y documentación de cada opción.
```

### B4 · Preparación técnica para HIPAA (análisis, sin afirmar cumplimiento)
```
[Encabezado común]

Objetivo: entregar un análisis de brechas técnicas para atender clínicas de EE. UU.: autenticación en dos pasos del personal, respaldos, cifrado, revisión de auditoría, cierre de sesión, registro de accesos y acceso de emergencia a expedientes de otras especialidades, y qué proveedores necesitarían contrato BAA (base de datos, hosting, correo, SMS).
Reglas: es un análisis técnico, NO asesoría legal. NUNCA afirmes que el sistema "cumple HIPAA". Separa lo que se puede implementar en código de lo que exige contratos, planes de los proveedores o revisión legal.
Si implementas algo (por ejemplo la autenticación en dos pasos), hazlo en un PR aparte y pequeño.
```

---

## Parte C · Prompts del arquitecto (Claude diseña, Copilot construye, Claude revisa)

### C1 · Verificación en dos pasos (MFA) para admin y doctor — fase 1 (app)
```
Lee CLAUDE.md, AGENTS.md y .github/copilot-instructions.md antes de empezar.
Esta versión de Next.js es distinta a la que conoces: revisa node_modules/next/dist/docs/ antes de escribir código.

Contexto: DentalFlow guarda datos de pacientes reales. Hoy se entra solo con correo y contraseña.
Supabase Auth trae MFA con app autenticadora (TOTP): supabase.auth.mfa.enroll / challenge / verify /
listFactors / getAuthenticatorAssuranceLevel (niveles aal1 y aal2). Nada de SMS.

Objetivo (fase 1, solo en la app; NO toques supabase/migrations ni la base):
1. Pantalla /seguridad (dentro de (app), visible para todos los roles desde el menú de perfil, no en la
   barra lateral): activar la app autenticadora (mostrar el QR y el código secreto que devuelve
   enroll, pedir el código de 6 dígitos y llamar verify). Si ya tiene un factor verificado, mostrar
   "Verificación en dos pasos activa" y la opción de quitarlo (unenroll) pidiendo antes un código válido.
2. Pantalla /login/verificar: después de entrar con contraseña, si el usuario tiene un factor TOTP
   verificado y su nivel es aal1, pedir el código (challenge + verify) antes de dejarlo pasar.
3. Obligatorio para admin y doctor: si el rol es admin o doctor y NO tiene factor verificado, solo
   puede ver /seguridad (redirigir ahí con un aviso claro) hasta activarlo. Si lo tiene y la sesión es
   aal1, redirigir a /login/verificar. Recepción y asistente dental (enfermeria): opcional.
   Hazlo en un solo lugar del servidor (junto a requireProfile en src/lib/auth.ts o en
   src/lib/supabase/proxy.ts), no página por página. Mantén la regla del proxy sobre la cabecera
   x-df-user-id tal como está.
4. Lógica pura (qué hacer según rol + factores + nivel) en src/lib/mfa.ts con pruebas Vitest
   (src/lib/mfa.test.ts): admin/doctor sin factor → "activar"; con factor y aal1 → "verificar";
   aal2 → "ok"; recepción/enfermeria sin factor → "ok".
5. Textos en español e inglés con data-i18n (solo textos fijos). Mensajes de error claros
   ("Código incorrecto o vencido. Intenta de nuevo."). Diseño actual: vidrio claro y azul cielo;
   no cambies barra lateral, ícono ni paleta.

Reglas:
- No inventes datos. No guardes el secreto TOTP en la base ni en logs.
- No agregues botones que no hagan nada. No borres nada clínico.
- Prueba E2E opcional si es viable con Supabase local; si no, explica en el PR cómo se probó a mano.

Entrega: rama nueva + Pull Request con capturas de las dos pantallas. Antes de terminar,
`npm run lint`, `npm test` y `npm run build` deben pasar.
```
Fase 2 (después, Claude): exigir aal2 también en la base (RLS) para admin y doctor.

### C2 · Huella digital (WebAuthn) como segundo paso — laptop y celular, opcional
**EN PAUSA (2026-10-12):** Supabase en la nube no permite activar WebAuthn como segundo paso. PR 48 en
borrador; ver `14-huella-webauthn.md`.

Diseño (Claude, 2026-10-11): la huella **reemplaza escribir el código de 6 dígitos**, no la contraseña.
Supabase Auth la registra como factor MFA `webauthn`; al verificarla la sesión queda en aal2, igual que
con el código, así que la base no cambia de lógica. La migración **032** (`mfa_satisfied()` cuenta
`webauthn` igual que `totp`) ya está escrita por Claude; se aplica en producción antes de unir este PR.
Inicio de sesión **sin contraseña** (passkey sola, `signInWithPasskey`) queda fuera: no está claro que dé
aal2 y saltaría la regla de MFA de la base.

Antes de unir (Darys, en el panel de Supabase): Authentication → Multi-Factor → activar **WebAuthn**
(enroll y verify) y fijar el dominio definitivo como Relying Party (`dentalflow-navy.vercel.app`).
Si el dominio cambia después, las huellas registradas dejan de servir y hay que registrarlas de nuevo.

```
Lee CLAUDE.md, AGENTS.md y .github/copilot-instructions.md antes de empezar.
Esta versión de Next.js es distinta a la que conoces: revisa node_modules/next/dist/docs/ antes de escribir código.

Contexto: hoy admin y doctor (y quien quiera) usan verificación en dos pasos con app autenticadora (TOTP):
/seguridad para activarla y /login/verificar para escribir el código. La base exige sesión aal2 a quien
tiene factor (migración 031; la 032 ya cuenta también factores 'webauthn'). NO toques supabase/migrations.

Objetivo: permitir, de forma OPCIONAL, usar la huella del dispositivo (Touch ID en Mac, Windows Hello en
laptop, lector de huella o desbloqueo del celular) en lugar de escribir el código de 6 dígitos.
Usa la API de Supabase ya instalada (@supabase/supabase-js 2.117): supabase.auth.mfa.enroll({ factorType:
"webauthn", friendlyName }) / challenge / verify, o los helpers de supabase.auth.mfa.webauthn
(revisa node_modules/@supabase/auth-js/dist/main/lib/types.d.ts y webauthn.d.ts). No uses signInWithPasskey.

1. /seguridad: sección "Huella digital" visible SOLO si la app autenticadora ya está activa (queda de
   respaldo si se pierde el equipo) y SOLO si el navegador lo soporta
   (window.PublicKeyCredential y PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()).
   Si no lo soporta, no se muestra nada (nada de botones que no hagan nada).
   - "Agregar huella de este dispositivo": pide un nombre (p. ej. "Laptop consultorio", "Mi celular"),
     hace enroll + verify. Se pueden tener varias (una por equipo).
   - Lista de huellas registradas (nombre y fecha) con "Quitar" en cada una (unenroll).
   - Quitar la app autenticadora mientras haya huellas: no permitido; primero quitar las huellas.
2. /login/verificar: si el usuario tiene un factor webauthn verificado y el navegador lo soporta, mostrar
   primero el botón "Usar huella" (challenge + verify webauthn). Debajo, siempre, "Usar código de la app
   autenticadora" con el formulario actual. Si la huella falla o se cancela, mensaje claro y queda el código.
3. Donde hoy se busca un factor verificado solo de tipo "totp" para decidir si pedir el segundo paso
   (src/lib/supabase/proxy.ts, src/app/login/actions.ts, src/app/login/verificar/page.tsx y
   verify-mfa-form.tsx), contar también "webauthn". La regla vive en src/lib/mfa.ts (getMfaDecision):
   agrega una función pura hasVerifiedSecondFactor(factors) con pruebas Vitest en src/lib/mfa.test.ts
   (totp verificado → true; webauthn verificado → true; solo no verificados → false; vacío → false).
   Admin y doctor siguen obligados a activar la app autenticadora primero.
4. E2E (Supabase local): en e2e/setup-local.sh activa [auth.mfa.web_authn] enroll_enabled y
   verify_enabled y [auth.webauthn] con rp_id "localhost" y rp_origins ["http://localhost:3100"].
   Prueba nueva e2e/13-huella.spec.ts con el autenticador virtual de Chromium (CDP:
   WebAuthn.enable + WebAuthn.addVirtualAuthenticator con protocol "ctap2", transport "internal",
   hasUserVerification e isUserVerified en true): un usuario con TOTP agrega huella en /seguridad, cierra
   sesión, entra con contraseña y pasa /login/verificar con "Usar huella". Si no es viable, explica en
   el PR por qué y cómo se probó a mano en Mac/Windows/celular.
5. Textos fijos en español e inglés con data-i18n. Diseño actual (vidrio claro, azul cielo); no cambies
   barra lateral, ícono ni paleta. Ícono de huella simple en línea con los demás.
6. Al desactivar una cuenta (deactivateAccount en src/app/(app)/accounts/actions.ts), después del bloqueo
   en Auth (ban_duration), borra TODOS sus factores de segundo paso (huellas y app autenticadora) con la
   API de administración: admin.auth.admin.mfa.listFactors({ userId }) y deleteFactor({ id, userId }).
   Así, si se reactiva, empieza de cero: admin y doctor tendrán que activar la app autenticadora otra vez
   (getMfaDecision → "activar"). Orden: perfil inactivo → bloqueo → borrar factores. Si borrar falla, la
   cuenta sigue desactivada y bloqueada; muestra "La cuenta quedó desactivada y bloqueada, pero no se
   pudieron quitar sus métodos de verificación. Inténtalo de nuevo." Reactivar no restaura nada.
   Agrega a e2e/13-huella.spec.ts (o a la prueba de cuentas que ya exista): desactivar un usuario con
   huella → no tiene factores; reactivarlo → al entrar, si es doctor, va a /seguridad.

Reglas:
- No guardes credenciales, claves públicas ni datos biométricos en tablas propias ni en logs: la huella
  nunca sale del dispositivo y Supabase guarda solo la clave pública. No inventes datos.
- Errores en la URL solo como clave conocida (errorKey), nunca texto libre.
- No unas el PR ni actives auto-merge.

Entrega: rama nueva + PR con capturas (laptop y celular). Antes de terminar, `npm run lint`, `npm test`
y `npm run build` deben pasar.
```

---

## Parte D · Supabase a 10/10 (plan en `pendientes/16-supabase-10.md`)

Orden: C3 → C4 → C5. C5 solo después de que Darys haga D1 y D3. Un PR por tarea.

### C3 · Tipos generados de la base + CLI de Supabase con versión fija
**✅ Hecho por Claude (2026-10-13, orden directa de Darys): rama `ccr-d305f1c9-2xjt1f`.** No dárselo a Copilot.
```
Lee CLAUDE.md, AGENTS.md y pendientes/16-supabase-10.md antes de empezar.

Objetivo: que un cambio de columna en la base rompa al compilar, no en producción.

1. CLI con versión fija: agrega `supabase` como devDependency con versión EXACTA (sin ^ ni ~,
   la última estable). En e2e/setup-local.sh cambia todo `npx -y supabase@latest` por `npx supabase`.
2. Script `npm run db:types`: genera los tipos desde el Supabase LOCAL (el que levanta
   `npm run test:e2e:setup`, con todas las migraciones menos 005 y 006):
   `supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts`
   (ejecútalo dentro del directorio de trabajo que usa setup-local.sh). Nunca contra producción.
3. Pasa el tipo a los cuatro clientes: createBrowserClient<Database> (client.ts),
   createServerClient<Database> (server.ts y proxy.ts) y createClient<Database> (admin.ts).
4. Corrige los errores de tipos que aparezcan. Reglas:
   - No uses `any`, `as unknown as` ni `@ts-ignore` para callarlos. Si un error revela un bug
     real (columna que no existe, tipo equivocado), corrígelo y descríbelo en el PR.
   - No cambies comportamiento, consultas ni columnas seleccionadas (siguen explícitas, nunca "*").
5. CI (.github/workflows/pruebas.yml): después de `npm run test:e2e:setup`, ejecuta
   `npm run db:types` y falla si `git diff --exit-code src/lib/supabase/database.types.ts`
   muestra cambios (alguien cambió una migración sin regenerar tipos).
6. Documenta en e2e/README.md: "si agregas una migración, corre npm run db:types y súbelo".

No toques: migraciones, diseño, textos. No unas el PR ni actives auto-merge.
Entrega: rama nueva + PR. Antes de terminar, `npm run lint`, `npm test` y `npm run build` deben pasar.
```

### C4 · Pruebas de la base en SQL (pgTAP)
```
Lee CLAUDE.md, AGENTS.md, pendientes/16-supabase-10.md y las reglas de .claude/rules/ de cada
tabla que pruebes, antes de empezar.

Objetivo: probar las reglas de seguridad DENTRO de la base, tabla por tabla, sin pasar por la
pantalla. Corre solo contra el Supabase local de las E2E, nunca contra producción.

1. Crea supabase/tests/*.sql con pgTAP y un script `npm run test:db` que copie esos archivos al
   directorio de trabajo de e2e/setup-local.sh y ejecute ahí `test db` con el CLI de versión fija
   (`node_modules/.bin/supabase`, como hacen setup-local.sh y db-types.sh; nunca `@latest`).
2. Pruebas de estructura (recorren el catálogo, así una tabla nueva queda cubierta sola):
   - Toda tabla de `public` tiene RLS activado. Excepciones permitidas solo en una lista explícita
     dentro de la prueba, cada una con su motivo.
   - Ninguna tabla clínica tiene privilegio DELETE para `authenticated` ni `anon`
     (patients, appointments, queue, clinical_entries, odontogram_entries, vital_signs,
     prescriptions, prescription_items, treatment_plan_items, billing_charges, billing_payments,
     patient_medical_history, doctor_schedules, doctor_time_off; revisa las migraciones por si falta alguna).
   - Toda tabla clínica tiene el trigger que llama a `audit_row`.
   - clinical_entries, odontogram_entries y vital_signs no tienen UPDATE para `authenticated`.
     Para prescriptions y prescription_items sigue lo que dice .claude/rules/recetas.md.
   - Toda función SECURITY DEFINER de `public` tiene `search_path` fijo y no es ejecutable por `anon`.
3. Pruebas de comportamiento, simulando usuarios (set local role authenticated +
   set local request.jwt.claims con sub, clinic_id y aal):
   - Aislamiento: un usuario de la clínica A no ve ni modifica filas de la clínica B en cada tabla
     clínica (select devuelve 0 filas; insert/update con clinic_id de B falla).
   - Roles: recepción no escribe en clinical_entries; asistente dental (enfermeria) no receta
     medicamentos; solo admin y recepción archivan pacientes.
   - MFA: un doctor con aal1 no lee pacientes (mfa_satisfied() = false).
   - Una corrección en clinical_entries exige corrects_entry_id y correction_reason.
   Usa datos ficticios claramente de prueba, creados dentro de la prueba (begin ... rollback).
4. CI: en .github/workflows/pruebas.yml, ejecuta `npm run test:db` después de
   `npm run test:e2e:setup` y antes de las E2E.
5. Si una prueba descubre un fallo real de seguridad, NO lo corrijas en este PR ni edites una
   migración existente: deja esa prueba marcada con todo('motivo') y descríbelo en el PR como
   grave, para que Claude escriba la migración nueva.

No toques: migraciones existentes, código de la app, diseño. No unas el PR ni actives auto-merge.
Entrega: rama nueva + PR. Antes de terminar, `npm run lint`, `npm test` y `npm run build` deben pasar.
```

### C5 · Verificación automática: repo ↔ producción (solo lectura)
```
Requisito: Darys ya hizo D1 y D3 de pendientes/16-supabase-10.md (historial reparado y secreto
SUPABASE_DB_URL_LECTURA creado). Lee CLAUDE.md, AGENTS.md y ese archivo antes de empezar.

Objetivo: enterarnos el mismo día si producción y supabase/migrations/ dejan de coincidir.

1. Script scripts/verificar-migraciones.mjs (Node, sin dependencias nuevas si se puede; si hace
   falta, usa `pg` como devDependency con versión exacta):
   - Lee los nombres de supabase/migrations/*.sql (sin .sql), ignorando 005 y 006.
   - Lee `select name from supabase_migrations.schema_migrations` usando SUPABASE_DB_URL_LECTURA.
   - Compara por NOMBRE (no por versión: en producción las versiones son fechas).
   - Imprime en español: "En el repo y sin aplicar en producción: …" y
     "Aplicadas en producción y sin archivo en el repo: …".
   - Sale con error solo si hay algo aplicado en producción que no está en el repo (eso es grave).
     Lo pendiente de aplicar es un aviso, no un error (es normal entre el merge y la aplicación).
   - Nunca imprime la cadena de conexión ni la contraseña. Solo SELECT: ninguna escritura.
2. Workflow .github/workflows/verificar-migraciones.yml: corre a diario (cron) y a mano
   (workflow_dispatch); permissions: contents: read; si falta el secreto, avisa y termina sin error
   (igual que respaldo-base.yml). No lo pongas en los PR (los PR de forks no deben ver el secreto).
3. Documenta en supabase/RESPALDO.md (o un archivo nuevo supabase/MIGRACIONES.md) cómo leer el
   resultado y la regla: toda migración se registra con el mismo nombre que su archivo.

No toques: migraciones, la base de producción (solo lectura), el workflow de respaldo.
No unas el PR ni actives auto-merge.
Entrega: rama nueva + PR. Antes de terminar, `npm run lint`, `npm test` y `npm run build` deben pasar.
```

---

## Parte E · Consultas (encounters)

### C6 · Pantalla de consultas (después de aplicar la migración 035 en producción)
```
Lee CLAUDE.md, AGENTS.md, supabase/MAPA.md y supabase/migrations/035_encounters.sql antes de empezar.

Contexto: la tabla `encounters` agrupa lo registrado en una visita. La abre el doctor o el asistente
dental (`enfermeria`); la cierra solo el doctor; cerrada no cambia. clinical_entries, odontogram_entries,
vital_signs y prescriptions tienen `encounter_id` opcional; la base rechaza enlazar a una consulta
cerrada o de otro paciente. Autor, rol, estado y fechas los pone la base: la app nunca los envía.

Objetivo, en la ficha del paciente (/patients/[id]):
1. Sección "Consultas": lista (más reciente primero) con fecha de apertura, quién la abrió, estado
   (Abierta / Cerrada), motivo y nota de cierre. Estado vacío honesto si no hay.
2. Botón "Abrir consulta" (solo doctor y asistente dental): motivo opcional (máx. 500) y cita opcional
   del mismo paciente (si viene desde una cita, preseleccionada). Una cita admite una sola consulta:
   si ya existe, mostrar el error de la base como mensaje claro.
3. Botón "Cerrar consulta" (solo doctor, solo si está abierta): nota de cierre opcional (máx. 1000) y
   confirmación. Cerrada no muestra botones.
4. Mientras haya una consulta abierta del paciente, los formularios de nota clínica, odontograma y
   signos vitales envían su `encounter_id` (recetas: no tocar `create_prescription` en este PR).
5. Textos fijos en español e inglés con data-i18n; nunca data-i18n en datos de Supabase.

Reglas: columnas explícitas (nunca select("*")); sin botones de borrar; errores en la URL solo como
errorKey; no toques migraciones ni la base; diseño actual sin cambios de paleta ni barra lateral.
Pruebas: E2E nueva en e2e/ (asistente abre, nota enlazada, doctor cierra, cerrada sin botones,
recepción no ve "Abrir consulta").
No unas el PR ni actives auto-merge.
Entrega: rama nueva + PR. Antes de terminar, `npm run lint`, `npm test` y `npm run build` deben pasar.
```

---

## Parte F · Procedimientos realizados

### C8 · Registrar procedimientos en la consulta (después de C6 y de aplicar la 038 en producción)
```
Lee CLAUDE.md, AGENTS.md, supabase/MAPA.md, .claude/rules/plan-tratamiento.md,
.claude/rules/odontograma.md y supabase/migrations/038_procedimientos_realizados.sql antes de empezar.

Contexto: `procedures_performed` guarda lo que el doctor hizo en una consulta abierta. Se registra con
`supabase.rpc("register_procedure", {...})`, que en un paso: crea el hallazgo del odontograma (si se
indica condición), guarda el procedimiento y completa el ítem del plan (si viene del plan). La base
pone autor y fechas y rechaza: consulta cerrada, ítem cancelado o de otro paciente, diente distinto al
del plan, segundo procedimiento vigente del mismo ítem, condición de superficie sin superficies.
No se edita: lo anula solo quien lo registró, con motivo (mín. 5); anular anula también el hallazgo que creó; el ítem del plan
sigue completado y admite registrarlo de nuevo.

Objetivo:
1. En la consulta abierta (pantalla de C6), solo doctor: botón "Registrar procedimiento". Formulario:
   ítem del plan pendiente o en proceso del paciente (opcional; al elegirlo, procedimiento, diente y
   superficies se precargan del plan; el diente queda fijo) o procedimiento libre (sugerencias de
   COMMON_PROCEDURES), diente FDI opcional, superficies, nota (máx. 2000) y condición del odontograma
   opcional (sugerida con suggestOdontogramCondition). Llama a register_procedure; muestra el error de
   la base como mensaje claro.
2. Lista "Procedimientos realizados" en la consulta y en la ficha del paciente: fecha, procedimiento,
   diente y superficies, quién lo hizo, nota; los anulados tachados con motivo. Estado vacío honesto.
3. Botón "Anular" (solo el doctor que lo registró, solo vigentes): motivo obligatorio y confirmación
   (update voided_at + void_reason; la base pone quién y cuándo).
4. Plan de tratamiento: si el paciente tiene una consulta abierta, "Completar" usa register_procedure
   con el ítem (en vez de cambiar el estado directo); sin consulta abierta queda como hoy.
5. Recepción y asistente dental ven la lista, sin botones.
6. Textos fijos en español e inglés con data-i18n; nunca data-i18n en datos de Supabase.

Reglas: columnas explícitas (nunca select("*")); sin botones de borrar; errores en la URL solo como
errorKey; no toques migraciones ni la base; diseño actual sin cambios de paleta ni barra lateral.
Pruebas: unitarias de la lógica nueva en src/lib/ y E2E en e2e/ (doctor registra desde el plan con
hallazgo, el ítem queda completado, anula con motivo, recepción ve sin botones).
No unas el PR ni actives auto-merge.
Entrega: rama nueva + PR. Antes de terminar, `npm run lint`, `npm test` y `npm run build` deben pasar.
```
