# Multi-tenant (varias clínicas en una sola app) — PRIORIDAD 1

Acordado el 2026-10-08. Ruta del producto: 1) multi-tenant, 2) dictado por voz → odontograma
(la IA propone, el doctor firma), 3) seguimiento de planes con aprobación de recepción,
4) copiloto de radiografías (segunda opinión), 5) visión: gemelo digital/biomecánica.

Desde el 2026-10-09 DentalFlow es **multi-tenant**: cada fila tiene `clinic_id` y la base aísla las clínicas (029 y 030 aplicadas en producción).

## Tareas (una por sesión para ahorrar tokens)
Reparto: **Claude** = base de datos y seguridad (1, 2, revisión de cada PR). **Copilot** = pantallas y pruebas (3, 4 pantalla, 5), solo después de que la 2 esté aplicada. Copilot nunca toca `supabase/migrations` ni la base. Una IA a la vez.
1. ✅ **[Claude] Inventario** — hecho (`11-inventario-multi-tenant.md`).
2. ✅ **[Claude] Migración 029** — hecha y aplicada el 2026-10-09.
3. ✅ **[Copilot] App:** la clínica sale de la base (`src/lib/clinic.ts`); las cuentas se crean dentro de la clínica del admin.
4. ✅ **[Claude base + Copilot pantalla] Alta de clínica nueva** — 030 aplicada y pantalla `/plataforma`.
5. ✅ **[Copilot, revisa Claude] Pruebas E2E de aislamiento** — `e2e/11-aislamiento-clinicas.spec.ts` y `e2e/12-plataforma.spec.ts`.

Falta: al desactivar una clínica, bloquear también el inicio de sesión de sus usuarios (Copilot, en la app; Claude revisa el PR).

## Pendiente aparte
- ✅ Respaldo diario (`supabase/RESPALDO.md`): activo desde el 2026-10-09 y verificado el 2026-10-10 (la llave privada abre el respaldo).
## IA nº 1 — Dictado por voz → odontograma (EN PAUSA desde 2026-10-09)
- **En pausa por decisión del fundador:** se retoma cuando exista la primera clínica real, porque la
  API de Claude tiene costo aparte. No crear clave ni código que la llame hasta entonces.
- Hecho: `src/lib/dictation.ts` (+ pruebas) revisa la propuesta de la IA: diente FDI válido,
  superficies M/D/O/V/L, condición permitida; lo dudoso se vuelve pregunta al doctor, nunca se adivina.
- Falta: (a) dictado en el navegador (Web Speech API, es-DO); (b) server action que manda el
  texto a la API de Claude y devuelve JSON (requiere `ANTHROPIC_API_KEY` en Vercel y decidir el
  consentimiento del paciente para enviar datos clínicos a un tercero); (c) pantalla de revisión:
  el doctor confirma y se guarda con el flujo normal del odontograma.
