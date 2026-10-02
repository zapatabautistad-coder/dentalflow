# DentalFlow

Sistema de gestión para clínicas dentales. Proyecto de portafolio.

**Stack:** Next.js (App Router, TypeScript, Tailwind) + Supabase.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Necesitas un archivo `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLINIC_NAME=
NEXT_PUBLIC_CLINIC_ADDRESS=
NEXT_PUBLIC_CLINIC_PHONE=
NEXT_PUBLIC_CLINIC_TAX_ID=
```

## Antes de dar una tarea por terminada

```bash
npm run build
npm run lint
```

## Más detalles

Ver `CLAUDE.md` para alcance del MVP, estado del proyecto y guía de diseño.
