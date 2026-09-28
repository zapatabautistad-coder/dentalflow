# Chatbot de IA para el personal (EN PAUSA)

**En pausa hasta que se venda esta instancia de la app** (indicado por el dueño del proyecto el 2026-09-28). No iniciar sin confirmación.

**Qué haría:** panel de chat (color teal, reservado para funciones de IA) visible al personal logueado, para preguntas de consulta sobre datos reales: "citas de hoy", "buscar paciente X", "resumen del historial de Y". Sin poder de crear/editar/archivar nada.

**Cómo se protegería contra datos inventados:** el servidor llamaría a las herramientas (tool use de la API de Claude) usando la sesión real del usuario que pregunta, así el asistente respeta el mismo RLS que ya tiene esa persona en el resto de la app. Si una herramienta no devuelve datos, el asistente dice que no hay información — nunca inventa.

**Bloqueado por (cuando se retome):**
1. Cuenta en console.anthropic.com con tarjeta cargada (no es una suscripción mensual fija: se cobra por consumo, centavos por mensaje).
2. `ANTHROPIC_API_KEY` en Vercel y en `.env.local`.

**Estado:** no iniciado, en pausa.
