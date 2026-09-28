> **Regla: responder siempre en español.**

@AGENTS.md

# DentalFlow

Sistema de gestión para clínicas dentales. Stack: Next.js (App Router, TypeScript, Tailwind, ESLint) + Supabase.

## Cómo trabajar
- Responder siempre en **español**, breve y paso a paso.
- **Producto real** para clínicas en República Dominicana, dentales y de medicina general (no es demo ni portafolio). Lo usan doctores, secretarias y enfermería con pacientes reales.
- Nunca mostrar datos inventados: todo número, lista o estado en pantalla sale de Supabase. Si no hay datos, se muestra un estado vacío honesto.
- Nunca inventar métricas, testimonios ni certificaciones (nada de "HIPAA compliant" ni similares).
- Nada de botones u opciones de menú que no hagan nada: si una función no existe todavía, no se muestra.
- El diseño está congelado: no cambiar barra lateral, ícono ni paleta sin que se pida explícitamente.
- Idiomas: solo español e inglés.
- **Nada clínico se borra**: pacientes y citas no tienen permiso DELETE en la base; un paciente se archiva (con motivo) y una cita se cancela. No agregar botones de borrar.
- **Todo cambio queda auditado**: `audit_log` guarda versión anterior, nueva, quién y cuándo (trigger `audit_row`). Toda tabla clínica nueva debe llevar ese trigger y no tener DELETE.
- Autor y fecha de un registro los pone la base de datos (triggers), nunca la app.
- **Registro clínico** (`clinical_entries`): solo INSERT y SELECT. Nunca agregar UPDATE/DELETE; un error se corrige con otra entrada (`corrects_entry_id` + `correction_reason`). Escriben solo doctor y enfermería.
- `data-i18n` solo en textos fijos, nunca en elementos que muestran datos de Supabase (nombres, motivos).
- Antes de decir que una tarea está terminada, ejecuta `npm run build` y `npm run lint`, corrige todos los errores que salgan y repite hasta que pasen sin errores. Luego haz commit.

## Referencia: demo HTML (v6)
- Vistas: Panel, Turnos, Pacientes, Odontograma, Citas, Horarios, Planes de tratamiento, Facturación, Análisis.
- Roles: Doctor, Recepción (secretaria/asistente), Enfermería, Admin.
- Idiomas: ES / EN.

## Diseño
- Fondo: degradado `#F5F7FA` → `#C3CFE2`.
- Barra lateral: paleta del logo, azul marino `#154360` (base) + aguamarina `#8FD3C4` (acento: bordes, iconos activos, detalles), texto blanco. Efecto vidrio esmerilado (fondo semitransparente con blur, brillo sutil en el borde superior, borde delgado claro). Clase `sidebar-glass` en `src/app/globals.css`. Toda la app usa esta paleta (botones, enlaces y acentos); verde solo con significado (estado "completada", diente sano, WhatsApp).
- Tipografía: Inter.
- Botones estilo vidrio (glassmorphism).
- El color **teal se reserva solo para funciones de IA**.

## Alcance
- **MVP (fase 1):** login con los 3 roles, Pacientes, Citas y Turnos; datos guardados en Supabase.
- **Después:** Odontograma, Facturación, WhatsApp (y el resto de vistas del demo).

## Estado
- En producción: https://dentalflow-navy.vercel.app (Vercel, se publica solo con cada push a `main`).
- Supabase con migraciones en `supabase/migrations/`. Aplicadas en producción: 001, 002, 003, 004, 007, 008, 009, 010, 011, 012, 013. **No ejecutar 005 ni 006** (ver aviso en cada archivo). Antes de escribir una migración nueva, revisar el esquema real de la base, no solo los archivos. Claves en `.env.local` (ignorado por git) y en Vercel:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Menú: Panel, Pacientes, Citas. (Horarios, Reportes y Configuración se borraron por tener datos inventados; se rehacen con datos reales cuando toque.)
- Cierre de sesión por inactividad a los 15 min (`src/app/(app)/idle-logout.tsx`): volver a una pestaña o desbloquear el celular NO cuenta como actividad.
- Odontograma, periodontograma y plan de tratamiento no guardan datos y muestran valores inventados; no tienen enlace desde la app hasta rehacerlos.
- Contraseñas (Supabase Auth): mínimo 10 caracteres con minúsculas, mayúsculas, números y símbolos. Pendiente al pasar a plan Pro: activar "Prevent use of leaked passwords".
- Clientes: `src/lib/supabase/client.ts` (navegador) y `src/lib/supabase/server.ts` (servidor).
- En Next 16 `middleware` se llama `proxy`: el refresco de sesión del login irá en `src/proxy.ts`.
- Toda tabla nueva necesita GRANT a `authenticated`, porque la exposición automática de tablas está desactivada.
- Pacientes: Enfermería puede **crear** pacientes nuevos (`canCreatePatients`, migración 013) pero no editarlos ni archivarlos (`canManagePatients`, solo admin/recepción).
- Cédula: `src/lib/cedula.ts` valida el dígito verificador (módulo 10) con pruebas en `src/lib/cedula.test.ts` (`npm test`, Vitest). Al crear un paciente (no al editar), `/api/patients/lookup-cedula` primero busca la cédula en `patients` (si ya existe, no autocompleta: avisa y enlaza a la ficha para no duplicar) y solo si no está localmente intenta un proveedor externo configurado por `IDENTITY_API_URL`/`IDENTITY_API_KEY`. Sin esas variables no hay mock ni datos inventados: el mensaje pide llenar a mano. Los campos autocompletados siguen editables.
- Tareas propuestas o en pausa (administración de cuentas, sala de espera, proveedor externo de cédula, chatbot de IA) documentadas en `pendientes/`, cada una con lo que falta y quién lo bloquea. Revisar ahí antes de asumir que algo no se ha discutido.
