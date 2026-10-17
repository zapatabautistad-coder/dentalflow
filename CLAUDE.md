> **Regla: responder siempre en español.**

@AGENTS.md

# DentalFlow

Sistema de gestión para clínicas dentales. Stack: Next.js (App Router, TypeScript, Tailwind, ESLint) + Supabase.

## Cómo trabajar
- **Fundador: Darys Zapata.** Ambicioso, innovador, quiere convertir DentalFlow en algo más que un SaaS. Respuestas cortas y precisas; separar lo real hoy de la visión. Ahorrar tokens: una tarea por sesión, prioridad actual: hoja de ruta clínica (consultas → procedimientos realizados); e-CF en pausa (`pendientes/17-facturacion-electronica.md`).
- Responder siempre en **español**, breve y paso a paso.
- **Estilo (decisión de Darys, 2026-10-16), también para textos y documentos que se entregan:** precisión de experto; máxima calidad por token. Sin introducciones, relleno, cortesías, conclusiones, preguntas retóricas ni recuadros de "pregunta y respuesta" (solo se admiten preguntas que expliquen reglas de la base). No repetir lo ya dicho ni explicar lo evidente. Listas compactas; ejemplos solo si son necesarios. Razonar a fondo pero entregar solo el resultado. Nunca sacrificar exactitud por brevedad.
- **Reparto (decisión de Darys, 2026-10-10): Claude es el arquitecto y revisor; Copilot construye.** Flujo: (1) Claude diseña la tarea y escribe el prompt para Copilot (guardarlo en `pendientes/06-prompts-para-agentes.md`); (2) Darys se lo da a Copilot; (3) Copilot abre el PR; (4) Claude lo revisa (errores, seguridad, reglas de este archivo), corrige en el mismo PR lo pequeño y comenta lo grande para que Copilot lo rehaga. Claude no programa funciones ni pantallas nuevas por su cuenta, salvo que Darys lo pida directamente.
- **Unir PR: solo Darys lo ordena (decisión de Darys, 2026-10-11).** Ningún agente (Claude, Copilot, Codex, Gemini) une un PR, activa auto-merge ni hace push a `main` por su cuenta, aunque la CI esté verde y la revisión aprobada. El agente deja el PR listo y avisa; une solo si Darys lo dice explícitamente para ese PR (una orden no vale para el siguiente).
- **Incidentes:** si algo sale mal en producción (app rota, clave filtrada, cuenta comprometida, datos dañados), seguir `INCIDENTES.md`.
- **Revisores automáticos:** Codex lee las "Review guidelines" de `AGENTS.md`. Gemini Code Assist **no está activo** (2026-10-11: pide pago y Darys decidió no pagarlo y desinstalar la app). `.gemini/` se conserva por si se activa más adelante. Sus comentarios son sugerencias: Claude los verifica antes de aplicar (no se aplican a ciegas).
- **Producto real** para clínicas **dentales** (no es demo ni portafolio). **Objetivo global (decisión de Darys, 2026-10-11):** DentalFlow no está hecho específicamente para República Dominicana; ahí empezó y ya trae lo local (cédula, ARS, exequátur, RD$), pero no se presenta como "hecho para República Dominicana" en textos, videos ni material de venta. Lo usan doctores, secretarias y asistentes dentales con pacientes reales. La medicina general irá en un proyecto aparte.
- Nunca mostrar datos inventados: todo número, lista o estado en pantalla sale de Supabase. Si no hay datos, se muestra un estado vacío honesto.
- Nunca inventar métricas, testimonios ni certificaciones (nada de "HIPAA compliant" ni similares).
- Nada de botones u opciones de menú que no hagan nada: si una función no existe todavía, no se muestra.
- El diseño está congelado: no cambiar barra lateral, ícono ni paleta sin que se pida explícitamente.
- Idiomas: solo español e inglés.
- **Nada clínico se borra**: pacientes y citas no tienen permiso DELETE en la base; un paciente se archiva (con motivo) y una cita se cancela. No agregar botones de borrar.
- **Todo cambio queda auditado**: `audit_log` guarda versión anterior, nueva, quién y cuándo (trigger `audit_row`). Toda tabla clínica nueva debe llevar ese trigger y no tener DELETE.
- Autor y fecha de un registro los pone la base de datos (triggers), nunca la app.
- **Registro clínico** (`clinical_entries`): solo INSERT y SELECT. Nunca agregar UPDATE/DELETE; un error se corrige con otra entrada (`corrects_entry_id` + `correction_reason`). Escriben solo doctor y asistente dental (`enfermeria`); medicamentos solo el doctor (023).
- `data-i18n` solo en textos fijos, nunca en elementos que muestran datos de Supabase (nombres, motivos).
- Antes de decir que una tarea está terminada, ejecuta `npm run build` y `npm run lint`, corrige todos los errores que salgan y repite hasta que pasen sin errores. Luego haz commit.

## Diseño
- **Idea de diseño: una sonrisa limpia y brillante.** Vidrio claro, azul cielo vivo, mucho aire y brillo suave. Sin azul oscuro pesado (ni marino ni dorado). Todo cambio visual debe conservar esa sensación.
- Fondo: degradado `#F0F9FF` → `#E0F2FE` con brillos celestes.
- Paleta azul cielo vivo: principal `#0E9BF3`, oscuro `#0766B5` (texto sobre claro, botones, enfoque), medio `#0D7FD8`, brillo `#53B6F7`, claro `#95D3FA`; texto sobre el azul de la barra `#062F55`. Toda la app usa esta paleta (botones, enlaces y acentos); verde solo con significado (estado "completada", diente sano, WhatsApp).
- Barra lateral, campana, ícono principal e historial de colores: `.claude/rules/diseno.md`.
- Nombre de marca: **DentalFlow Clinical OS** (decisión de Darys, 2026-10-11). "Clinical OS" acompaña a "DentalFlow" en la barra lateral (no en la barra superior del celular), el login, el título del sitio y la imagen de venta; los títulos de cada página siguen con "DentalFlow". No se traduce.
- Tipografía: Inter.
- Botones estilo vidrio (glassmorphism).
- El color **teal se reserva solo para funciones de IA** y debe verse claramente más verde que el azul de la app.

## Estado
- **Reglas por módulo en `.claude/rules/`**: sala-de-espera, cuentas (y contraseñas), panel, horarios, inactividad, odontograma, plan-tratamiento, facturacion, signos-vitales, recetas, cedula y diseno. Claude Code carga cada una sola al leer o editar archivos de su módulo. Leerla a mano antes de revisar un PR que toque ese módulo o de escribir una migración nueva sobre sus tablas. Demo v6 y alcance original: `docs/contexto.md`.
- En producción: https://dentalflow-navy.vercel.app (Vercel, se publica solo con cada push a `main`).
- Supabase con migraciones en `supabase/migrations/`. Aplicadas en producción: 001–004 y 007–035 (028 = `appointments_no_overlap`, aplicada el 2026-10-04 antes que 025; el archivo se agregó después. 029 multi-tenant y 030 plataforma aplicadas el 2026-10-09 desde el SQL Editor, porque `apply_migration` se cuelga con operaciones destructivas). 031 (MFA en la base) aplicada el 2026-10-11. 032 (huella/WebAuthn cuenta como segundo paso) aplicada el 2026-10-11; sin efecto mientras no haya huellas: la huella está en pausa porque Supabase en la nube no permite activarla (`pendientes/14-huella-webauthn.md`). 033 (el paciente de un registro no se puede cambiar) y 034 (endurecimiento tras la auditoría: MFA de plataforma, autor y fecha de pacientes y citas, TRUNCATE bloqueado, sin borrado en cascada, cobros del doctor solo de sus pacientes) aplicadas el 2026-10-16 desde el SQL Editor y verificadas. 035 (consultas: `encounters` y `encounter_id` en notas, odontograma, signos vitales y recetas) aplicada y registrada el 2026-10-16.  036 (IA: `ai_consents`, `ai_sessions`, `ai_drafts`, `source` en notas, odontograma y signos) **pendiente de aplicar**. **No ejecutar 005 ni 006** (ver aviso en cada archivo). **Mapa del esquema: `supabase/MAPA.md` y `supabase/schema.sql` (esquema actual generado); leerlos en vez de recorrer las migraciones.** Antes de escribir una migración nueva, revisar además el esquema real de producción. Claves en `.env.local` (ignorado por git) y en Vercel:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Menú: Panel, Pacientes, Citas, Sala de espera, Análisis (doctor/admin), Horarios (admin, recepción, doctor), Cuentas (solo admin). (Reportes y Configuración se borraron por tener datos inventados; se rehacen con datos reales cuando toque.)
- Errores en la URL solo como clave conocida (`errorKey`), nunca como texto libre.
- Periodontograma se borró por tener datos inventados; se rehace guardando datos reales en Supabase.
- Clientes: `src/lib/supabase/client.ts` (navegador) y `src/lib/supabase/server.ts` (servidor).
- En Next 16 `middleware` se llama `proxy`: el refresco de sesión del login irá en `src/proxy.ts`.
- Toda tabla nueva necesita GRANT a `authenticated`, porque la exposición automática de tablas está desactivada.
- Rol `enfermeria` en la base = "Asistente dental" en pantalla (solo cambia la etiqueta). Pacientes: el asistente dental puede **crear** pacientes nuevos (`canCreatePatients`, migración 013) pero no editarlos ni archivarlos (`canManagePatients`, solo admin/recepción).
- Pruebas E2E (Playwright, `e2e/`, ver `e2e/README.md`): 36 pruebas por rol (login y menú, sala de espera, paciente → cita → horarios, odontograma, plan, cobro, signos vitales y permisos). Corren **solo contra Supabase local** en Docker (`npm run test:e2e:setup`), nunca contra producción. Vitest excluye `e2e/`.
- Seguridad (revisión 2026-10-04, `pendientes/10-revision-seguridad.md`): el proxy (`src/proxy.ts`) debe correr en toda ruta de la app; solo excluye archivos de `public/` en el primer nivel, porque borra la cabecera interna `x-df-user-id` que usa `requireProfile`. Cabeceras de seguridad en `next.config.ts`. `audit_log` se ve según el rol (025). No sanitizar texto clínico (React ya escapa); nunca usar `dangerouslySetInnerHTML` con datos de Supabase o de la IA sin sanitizar. Consultas con columnas explícitas, nunca `select("*")`. Dependabot solo de seguridad (`.github/dependabot.yml`, sin PR de versiones) y `.github/CODEOWNERS` activos. Respaldo nocturno cifrado activo y verificado (2026-10-10, `supabase/RESPALDO.md`). MFA: la app lo pide a admin, doctor y a quien tenga factor (fase 1); la 031 hace que la base también lo exija (`mfa_satisfied()` dentro de `get_my_role()` e `is_platform_admin()`; antes del segundo paso solo se lee el propio perfil).
- **Guardias automáticas** (`.claude/settings.json`, `.claude/hooks/`): bloquean push a `main`, unir PR, cambios en producción (Supabase, Vercel), leer `.env` y editar migraciones que ya están en `main`; avisan de `select("*")`, `dangerouslySetInnerHTML`, `delete()` y migraciones sin RLS, GRANT o auditoría. La salida de test, lint y build viene recortada (completa: `DF_SALIDA_COMPLETA=1 <comando>`). Revisar un PR: `/revisar-pr <número>`.
- Tareas propuestas o en pausa (administración de cuentas, sala de espera, proveedor externo de cédula, chatbot de IA, huella digital) documentadas en `pendientes/`, cada una con lo que falta y quién lo bloquea. Revisar ahí antes de asumir que algo no se ha discutido.

## Instrucciones de compactación
Al compactar, conservar: la tarea actual con su rama y PR, las decisiones de Darys en la sesión, los archivos tocados, los errores pendientes de lint, test o build y las reglas de módulo ya leídas. Descartar salidas de comandos ya resueltas.
