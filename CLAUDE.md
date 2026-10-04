> **Regla: responder siempre en español.**

@AGENTS.md

# DentalFlow

Sistema de gestión para clínicas dentales. Stack: Next.js (App Router, TypeScript, Tailwind, ESLint) + Supabase.

## Cómo trabajar
- Responder siempre en **español**, breve y paso a paso.
- **Producto real** para clínicas **dentales** en República Dominicana (no es demo ni portafolio). Lo usan doctores, secretarias y asistentes dentales con pacientes reales. La medicina general irá en un proyecto aparte.
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

## Referencia: demo HTML (v6)
- Vistas: Panel, Turnos, Pacientes, Odontograma, Citas, Horarios, Planes de tratamiento, Facturación, Análisis.
- Roles: Doctor, Recepción (secretaria/asistente), Enfermería, Admin.
- Idiomas: ES / EN.

## Diseño
- **Idea de diseño: una sonrisa limpia y brillante.** Vidrio claro, azul cielo vivo, mucho aire y brillo suave. Sin azul oscuro pesado (ni marino ni dorado). Todo cambio visual debe conservar esa sensación.
- Fondo: degradado `#F0F9FF` → `#E0F2FE` con brillos celestes.
- Paleta azul cielo vivo: principal `#0E9BF3`, oscuro `#0766B5` (texto sobre claro, botones, enfoque), medio `#0D7FD8`, brillo `#53B6F7`, claro `#95D3FA`; texto sobre el azul de la barra `#062F55`. Toda la app usa esta paleta (botones, enlaces y acentos); verde solo con significado (estado "completada", diente sano, WhatsApp).
- Barra lateral: clase `sidebar-crystal` en `src/app/globals.css`. Vidrio esmerilado con el azul vivo arriba que **se desvanece hasta quedar transparente abajo**; menú y logo con texto azul oscuro; la zona inferior (idioma y perfil) en vidrio blanco. En el celular, la barra superior es `topbar-crystal` y el menú abierto `crystal-overlay` (mismo degradado, opaco).
- Botón de notificaciones: clase `bell-glass` (cristal azul translúcido con borde definido y reflejo).
- Ícono principal: diente de cristal en azul cielo (`public/dentalflow-app-icon-sky.png`, `dentalflow-app-icon-3d-sky.png` y `dentalflow-mark-sky.png`). Si se recolorea una imagen, cambiarle el nombre para no chocar con la caché de imágenes de Next.
- Tipografía: Inter.
- Botones estilo vidrio (glassmorphism).
- El color **teal se reserva solo para funciones de IA** y debe verse claramente más verde que el azul de la app.
- Historial: la versión anterior en azul marino `#154360` + aguamarina `#8FD3C4` está en el commit `aa64a2f`.

## Alcance
- **MVP (fase 1):** login con los 3 roles, Pacientes, Citas y Turnos; datos guardados en Supabase.
- **Después:** Odontograma, Facturación, WhatsApp (y el resto de vistas del demo).

## Estado
- En producción: https://dentalflow-navy.vercel.app (Vercel, se publica solo con cada push a `main`).
- Supabase con migraciones en `supabase/migrations/`. Aplicadas en producción: 001, 002, 003, 004, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025. **No ejecutar 005 ni 006** (ver aviso en cada archivo). Antes de escribir una migración nueva, revisar el esquema real de la base, no solo los archivos. Claves en `.env.local` (ignorado por git) y en Vercel:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Sala de espera (`/waiting-room`, tabla `queue`): recepción/admin mueven toda la fila; el doctor solo sus turnos y tiene "Llamar siguiente". Horas y pasos válidos (en_espera → llamado → en_atencion → atendido, o cancelado) los impone el trigger `stamp_queue` (014); sin DELETE y con auditoría. La posición del turno la asigna la base (trigger `assign_queue_position`, 016, con candado por fecha); la app no la calcula.
- Cuentas (`/accounts`, solo admin, 015): crear usuario (API de Auth con `SUPABASE_SERVICE_ROLE_KEY`, solo servidor en `src/lib/supabase/admin.ts`), cambiar rol, desactivar con motivo y reactivar. Nunca se borran. Usuario desactivado: `get_my_role()` devuelve null (sin acceso a nada por RLS) y queda bloqueado en Auth. El trigger `stamp_profile` impide cambiar el propio rol o desactivarse y exige al menos un admin activo; `profiles` tiene auditoría y no tiene DELETE.
- Panel: los pacientes pendientes de revisión salen de la función `patients_for_review` (017, `security invoker`, con LIMIT); si no existe, la app usa un respaldo acotado.
- Menú: Panel, Pacientes, Citas, Sala de espera, Cuentas (solo admin). (Horarios, Reportes y Configuración se borraron por tener datos inventados; se rehacen con datos reales cuando toque.)
- Cierre de sesión por inactividad a los 15 min (`src/app/(app)/idle-logout.tsx`): volver a una pestaña o desbloquear el celular NO cuenta como actividad.
- Odontograma (`/patients/[id]/odontograma`, tabla `odontogram_entries`, migración 018): cada hallazgo (diente FDI, superficies M/D/O/V/L, condición) es una entrada firmada por la base; solo INSERT y SELECT, un error se anula con otra entrada (`corrects_entry_id` + motivo). Escribe solo el doctor; todos leen. El estado actual de cada diente lo calcula `src/lib/odontogram.ts` (con pruebas).
- Plan de tratamiento (`/patients/[id]/plan-tratamiento`, tabla `treatment_plan_items`, migración 019): procedimientos con diente opcional y costo en RD$; estados pendiente → en_proceso → completado, o cancelado con motivo (trigger `stamp_treatment_plan_item`). Solo cambia el estado; sin DELETE y con auditoría. Escribe solo el doctor; todos leen. Lógica y totales en `src/lib/treatment-plan.ts` (con pruebas). Al marcar completado un procedimiento con diente, el doctor puede registrar el resultado en el odontograma en el mismo paso (condición sugerida por `suggestOdontogramCondition`; diente y superficies salen del procedimiento guardado).
- Facturación (tablas `billing_charges` y `billing_payments`, migración 020): cargos con cobertura de ARS (`patient_amount` calculado por la base) y reclamo a la ARS (pendiente → reclamado → pagado/rechazado); pagos con recibo consecutivo de la base (`billing_receipt_seq`). Sin DELETE ni edición: se anula con motivo; auditado. Registran recepción y admin (`canManageBilling`), el doctor ve (`canViewBilling`), enfermería sin acceso. Acciones en `src/app/(app)/patients/[id]/facturacion/actions.ts`, balance en `src/lib/billing.ts`. Pantalla en `/patients/[id]/facturacion` (hecha por Copilot, PR #4). Un procedimiento del plan solo puede tener un cargo vigente (índice parcial, 021): si el cargo se anula, se puede volver a cobrar.
- Periodontograma se borró por tener datos inventados; se rehace guardando datos reales en Supabase.
- Contraseñas (Supabase Auth): mínimo 10 caracteres con minúsculas, mayúsculas, números y símbolos. Pendiente al pasar a plan Pro: activar "Prevent use of leaked passwords".
- Clientes: `src/lib/supabase/client.ts` (navegador) y `src/lib/supabase/server.ts` (servidor).
- En Next 16 `middleware` se llama `proxy`: el refresco de sesión del login irá en `src/proxy.ts`.
- Toda tabla nueva necesita GRANT a `authenticated`, porque la exposición automática de tablas está desactivada.
- Rol `enfermeria` en la base = "Asistente dental" en pantalla (solo cambia la etiqueta). Pacientes: el asistente dental puede **crear** pacientes nuevos (`canCreatePatients`, migración 013) pero no editarlos ni archivarlos (`canManagePatients`, solo admin/recepción).
- Cédula: `src/lib/cedula.ts` valida el dígito verificador (módulo 10) con pruebas en `src/lib/cedula.test.ts` (`npm test`, Vitest). Al crear un paciente (no al editar), `/api/patients/lookup-cedula` primero busca la cédula en `patients` (si ya existe, no autocompleta: avisa y enlaza a la ficha para no duplicar) y solo si no está localmente intenta un proveedor externo configurado por `IDENTITY_API_URL`/`IDENTITY_API_KEY`. Sin esas variables no hay mock ni datos inventados: el mensaje pide llenar a mano. Los campos autocompletados siguen editables.
- Pruebas E2E (Playwright, `e2e/`, ver `e2e/README.md`): 19 pruebas por rol (login y menú, sala de espera, paciente → cita → horarios, odontograma, plan, cobro y permisos). Corren **solo contra Supabase local** en Docker (`npm run test:e2e:setup`), nunca contra producción. Vitest excluye `e2e/`.
- Seguridad (revisión 2026-10-04, `pendientes/10-revision-seguridad.md`): el proxy (`src/proxy.ts`) debe correr en toda ruta de la app; solo excluye archivos de `public/` en el primer nivel, porque borra la cabecera interna `x-df-user-id` que usa `requireProfile`. Cabeceras de seguridad en `next.config.ts`. `audit_log` se ve según el rol (025).
- Tareas propuestas o en pausa (administración de cuentas, sala de espera, proveedor externo de cédula, chatbot de IA) documentadas en `pendientes/`, cada una con lo que falta y quién lo bloquea. Revisar ahí antes de asumir que algo no se ha discutido.
