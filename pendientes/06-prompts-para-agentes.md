# Prompts listos para asignar trabajo

**Cómo usarlos:** copia cada prompt tal cual como un Issue de GitHub (o como mensaje al agente). Las tareas de la **Parte A** son acotadas y de bajo riesgo: apropiadas para Copilot. Las de la **Parte B** son complejas o delicadas: van a un agente avanzado, con revisión del dueño del proyecto.

Regla general para todas: se trabaja en una rama y se abre un Pull Request; **nunca push directo a `main`** (`main` se publica solo en producción).

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
