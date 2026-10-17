# Decisiones y contexto de DentalFlow

Detalle de lo que `CLAUDE.md` resume. Leer la sección que toque la tarea, no todo el archivo. Estado de las migraciones: `supabase/MAPA.md`.

## Producto
- **Fundador: Darys Zapata.** Ambicioso, innovador, quiere convertir DentalFlow en algo más que un SaaS. Respuestas cortas y precisas; separar lo real hoy de la visión. Prioridad actual: hoja de ruta clínica (consultas → procedimientos realizados); e-CF en pausa (`pendientes/17-facturacion-electronica.md`).
- **Producto real** para clínicas **dentales** (no es demo ni portafolio). Lo usan doctores, secretarias y asistentes dentales con pacientes reales. La medicina general irá en un proyecto aparte.
- **Objetivo global (2026-10-11):** DentalFlow no está hecho específicamente para República Dominicana; ahí empezó y ya trae lo local (cédula, ARS, exequátur, RD$), pero no se presenta como "hecho para República Dominicana" en textos, videos ni material de venta.
- Nombre de marca: **DentalFlow Clinical OS** (2026-10-11). "Clinical OS" acompaña a "DentalFlow" en la barra lateral (no en la barra superior del celular), el login, el título del sitio y la imagen de venta; los títulos de cada página siguen con "DentalFlow". No se traduce.
- Menú: Panel, Pacientes, Citas, Sala de espera, Análisis (doctor/admin), Horarios (admin, recepción, doctor), Cuentas (solo admin). Reportes, Configuración y Periodontograma se borraron por tener datos inventados; se rehacen con datos reales cuando toque.

## Forma de trabajar
- **Estilo (2026-10-16), también para textos y documentos que se entregan:** precisión de experto; máxima calidad por token. Sin introducciones, relleno, cortesías, conclusiones, preguntas retóricas ni recuadros de "pregunta y respuesta" (solo se admiten preguntas que expliquen reglas de la base). No repetir lo ya dicho ni explicar lo evidente. Listas compactas; ejemplos solo si son necesarios. Razonar a fondo pero entregar solo el resultado. Nunca sacrificar exactitud por brevedad.
- **Mientras trabaja (2026-10-17):** no narrar pasos. Solo avisar lo necesario (bloqueo, decisión o cambio de rumbo); el resultado, al final y corto.
- **Reparto (2026-10-10): Claude es el arquitecto y revisor; Copilot construye.** (1) Claude diseña la tarea y escribe el prompt para Copilot con la plantilla de `pendientes/06-prompts-para-agentes.md`; (2) Darys se lo da a Copilot; (3) Copilot abre el PR; (4) Claude lo revisa, corrige en el mismo PR lo pequeño y comenta lo grande para que Copilot lo rehaga. Claude no programa funciones ni pantallas nuevas por su cuenta, salvo que Darys lo pida directamente.
- **Unir PR: solo Darys lo ordena (2026-10-11).** Ningún agente (Claude, Copilot, Codex, Gemini) une un PR, activa auto-merge ni hace push a `main`, aunque la CI esté verde y la revisión aprobada. Una orden de unir vale solo para ese PR.
- **Migraciones agrupadas (2026-10-17):** no una migración por cada cambio. Se diseña y prueba todo en local (Supabase en Docker) y se corrige; cuando no queda nada pendiente, una sola migración con todo, aplicada una vez. Mientras la migración en curso no esté en producción, se edita en vez de crear otra.
- **Toda migración viaja con su prueba SQL** (`supabase/tests/`) y su línea en `supabase/MAPA.md` (2026-10-17). Lo comprueban el hook de commit y la CI con `scripts/check-migraciones.mjs`.
- **Revisores automáticos:** Codex lee las "Review guidelines" de `AGENTS.md`. Gemini Code Assist no está activo (2026-10-11: pide pago; Darys decidió no pagarlo). `.gemini/` se conserva. Las sugerencias de cualquier otro modelo se verifican antes de aplicarse.
- **Incidentes:** si algo sale mal en producción (app rota, clave filtrada, cuenta comprometida, datos dañados), seguir `INCIDENTES.md`.

## Diseño (congelado)
- **Idea: una sonrisa limpia y brillante.** Vidrio claro, azul cielo vivo, mucho aire y brillo suave. Sin azul oscuro pesado (ni marino ni dorado). Todo cambio visual conserva esa sensación.
- Fondo: degradado `#F0F9FF` → `#E0F2FE` con brillos celestes.
- Paleta azul cielo vivo: principal `#0E9BF3`, oscuro `#0766B5` (texto sobre claro, botones, enfoque), medio `#0D7FD8`, brillo `#53B6F7`, claro `#95D3FA`; texto sobre el azul de la barra `#062F55`. Toda la app usa esta paleta; verde solo con significado (estado "completada", diente sano, WhatsApp).
- Tipografía: Inter. Botones estilo vidrio (glassmorphism).
- El color **teal se reserva solo para funciones de IA** y se ve claramente más verde que el azul de la app.
- Barra lateral, campana, ícono principal e historial de colores: `.claude/rules/diseno.md`.

## Estado técnico
- Producción: https://dentalflow-navy.vercel.app (Vercel, se publica solo con cada push a `main`). Claves en `.env.local` (ignorado por git) y en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Clientes Supabase: `src/lib/supabase/client.ts` (navegador) y `src/lib/supabase/server.ts` (servidor).
- En Next 16 `middleware` se llama `proxy` (`src/proxy.ts`). El proxy corre en toda ruta de la app; solo excluye archivos de `public/` en el primer nivel, porque borra la cabecera interna `x-df-user-id` que usa `requireProfile`.
- **Registro clínico** (`clinical_entries`): solo INSERT y SELECT; un error se corrige con otra entrada (`corrects_entry_id` + `correction_reason`). Escriben solo doctor y asistente dental (`enfermeria`); medicamentos solo el doctor (023).
- Rol `enfermeria` en la base = "Asistente dental" en pantalla. El asistente dental puede **crear** pacientes (`canCreatePatients`, 013) pero no editarlos ni archivarlos (`canManagePatients`, solo admin/recepción).
- Pruebas: unitarias con Vitest (excluye `e2e/`); de base con pgTAP (`supabase/tests/`, `npm run test:db`); E2E con Playwright (`e2e/`, ver `e2e/README.md`), por rol. Las de base y E2E corren **solo contra Supabase local** en Docker (`npm run test:e2e:setup`), nunca contra producción.
- Seguridad (revisión 2026-10-04, `pendientes/10-revision-seguridad.md`): cabeceras en `next.config.ts`; `audit_log` se ve según el rol (025); no sanitizar texto clínico (React ya escapa); Dependabot solo de seguridad y `.github/CODEOWNERS` activos; respaldo nocturno cifrado verificado (2026-10-10, `supabase/RESPALDO.md`).
- MFA: la app lo pide a admin, doctor y a quien tenga factor (fase 1); la 031 hace que la base también lo exija (`mfa_satisfied()` dentro de `get_my_role()` e `is_platform_admin()`; antes del segundo paso solo se lee el propio perfil). Huella (WebAuthn) en pausa: `pendientes/14-huella-webauthn.md`.
- **Guardias automáticas** (`.claude/settings.json`, `.claude/hooks/`): bloquean push a `main`, unir PR, cambios en producción (Supabase, Vercel), leer `.env`, editar migraciones que ya están en `main` y commits de migraciones sin prueba SQL o sin línea en MAPA; avisan de `select("*")`, `dangerouslySetInnerHTML`, `delete()` y migraciones sin RLS, GRANT o auditoría. La salida de verificación viene recortada (completa: `DF_SALIDA_COMPLETA=1 <comando>`).
- Tareas propuestas o en pausa (cuentas, sala de espera, cédula externa, chatbot de IA, huella) en `pendientes/`, cada una con lo que falta y quién la bloquea: revisar ahí antes de asumir que algo no se ha discutido.
- Verificación: `npm run verify:fast` (lint, typecheck, unitarias) antes de cada commit; `npm run verify` añade build y pruebas de base (requiere Docker). La CI corre todo.
- Demo v6 y alcance original: `docs/contexto.md`.
