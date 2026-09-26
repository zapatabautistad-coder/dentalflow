> **Regla: responder siempre en español.**

@AGENTS.md

# DentalFlow

Sistema de gestión para clínicas dentales. Stack: Next.js (App Router, TypeScript, Tailwind, ESLint) + Supabase.

## Cómo trabajar
- Responder siempre en **español**, breve y paso a paso.
- Proyecto de **portafolio**: nunca inventar métricas, testimonios ni certificaciones (nada de "HIPAA compliant" ni similares).
- Antes de decir que una tarea está terminada, ejecuta `npm run build` y `npm run lint`, corrige todos los errores que salgan y repite hasta que pasen sin errores. Luego haz commit.

## Referencia: demo HTML (v6)
- Vistas: Panel, Turnos, Pacientes, Odontograma, Citas, Horarios, Planes de tratamiento, Facturación, Análisis.
- Roles: Doctor, Recepción, Admin.
- Idiomas: ES / EN.

## Diseño
- Fondo: degradado `#F5F7FA` → `#C3CFE2`.
- Barra lateral: degradado morado `#667EEA` → `#764BA2`.
- Tipografía: Inter.
- Botones estilo vidrio (glassmorphism).
- El color **teal se reserva solo para funciones de IA**.

## Alcance
- **MVP (fase 1):** login con los 3 roles, Pacientes, Citas y Turnos; datos guardados en Supabase.
- **Después:** Odontograma, Facturación, WhatsApp (y el resto de vistas del demo).

## Estado
- Supabase conectado (sin tablas todavía). Claves en `.env.local` (ignorado por git):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Clientes: `src/lib/supabase/client.ts` (navegador) y `src/lib/supabase/server.ts` (servidor).
- En Next 16 `middleware` se llama `proxy`: el refresco de sesión del login irá en `src/proxy.ts`.
- Toda tabla nueva necesita GRANT a `authenticated`, porque la exposición automática de tablas está desactivada.
