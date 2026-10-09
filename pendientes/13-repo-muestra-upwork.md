# Repo de muestra para clientes de Upwork (en pausa, 2026-10-09)

Darys se postuló a un trabajo de Upwork (sitio web de atención médica). Si el cliente pide ver código,
**no se da acceso a DentalFlow** (es producto comercial; el historial y `pendientes/` revelan el plan).

## Cuándo se hace
Solo cuando Darys diga que un cliente pidió ver código. Se hace en una sesión aparte, sin mezclar con el multi-tenant.

## Qué sería
- Repo público nuevo, separado de DentalFlow, sin copiar su código ni sus migraciones.
- Proyecto pequeño para enseñar: mini sistema de citas con roles (RLS), auditoría de cambios,
  registros que no se borran y pruebas (Vitest + Playwright).
- Mismo stack: Next.js, TypeScript, Tailwind, Supabase.
- Solo datos de prueba, nunca pacientes reales.

## Mientras tanto
Si un cliente pide código: recorrido en vivo por chat o videollamada con subtítulos, o 2–3 archivos sueltos
sin datos ni claves (por ejemplo `src/lib/cedula.ts` con su prueba).

## Relacionado
- Si el repo de DentalFlow pasa a privado, guardar en `CLAUDE.md` el perfil del fundador que pidió Darys
  (está en la conversación del 2026-10-09; no se escribe aquí mientras el repo sea público).
