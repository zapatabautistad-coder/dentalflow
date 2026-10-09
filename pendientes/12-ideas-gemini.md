# Ideas de la conversación con Gemini — qué falta en DentalFlow

Se va llenando a medida que Darys comparte partes de esa conversación. Aquí solo
entra lo que **aún no existe** en DentalFlow, con la opinión de Claude. Nada de
esto está aprobado; la prioridad sigue siendo `11-multi-tenant.md`.

Ojo: Gemini no ve el repo ni la base. Su "esquema-dentalflow.sql" estaba viejo
(no tenía 026 signos vitales ni 027 recetas, que ya existen).

## A. Cerca (después del multi-tenant)

| Idea | Opinión / cuidado |
|---|---|
| **País, moneda y zona horaria en `clinics`** | Agregar `country_code` (solo `'DO'` por ahora), `currency` (`'DOP'`), `timezone` (`'America/Santo_Domingo'`) a la 029 antes de aplicarla. `enforce_appointment_schedule` tiene la zona fija: leerla de la clínica. Revisar que `queue_date` no dependa del UTC del servidor. Si se cobra en USD a veces, la moneda va por cargo, no solo por clínica. Otros países: solo con tracción en RD. |
| **`is_preexisting` en `odontogram_entries`** | Buena y barata: separa el diagnóstico inicial del trabajo hecho en la clínica. Se fija al crear, no se cambia. |
| **Archivos y radiografías** | Bucket **privado**, RLS por clínica/paciente, URLs firmadas que vencen, tabla solo INSERT con auditoría. Base del copiloto de radiografías. |
| **Consentimientos informados** | Ligados a `treatment_plan_item_id`; guardar el documento/imagen firmada, quién y cuándo (un booleano no vale legalmente). |
| **NCF / e-CF (DGII)** | Diseñar para e-CF (E31, E32…), no solo B01/B02. Rangos autorizados por clínica con vencimiento y consecutivo por tipo. Confirmar ITBIS en servicios de salud con un contador. |
| **Seguimiento de planes pendientes (borrador de WhatsApp con IA)** | Es el punto 3 de la ruta. La IA solo redacta; recepción **siempre** aprueba (no lo decide el modelo). Sin presión, sin inventar riesgos, sin nombrar el procedimiento ni precios. WhatsApp Business no permite texto libre fuera de 24 h: usar enlace `wa.me` desde la clínica. Consentimiento y "no me escriban" (Ley 172-13). Registro de contactos solo INSERT. Botón en teal (IA). Prompt corregido en la conversación del 2026-10-09. |

## B. Visión (no antes de tener clínicas pagando)

| Idea | Opinión / cuidado |
|---|---|
| CAD/CAM e impresión 3D | Rescatable: adjuntar `.STL` del escáner y enviarlos al laboratorio. Diseñar coronas/guías es software regulado; el navegador no imprime directo sin un agente local. |
| T-Scan (fuerza de mordida) | "Se fracturará en 6 meses" sería una predicción inventada. Requiere acuerdo con el fabricante. Nicho. |
| Fluorescencia (DIAGNOdent) | Rescatable: registrar la lectura con su fuente y que el doctor firme. Nunca "cero subjetividad" ni entradas automáticas. Web Bluetooth no funciona en iPhone. |
| Realidad mixta en cirugía | Es navegación quirúrgica certificada; no se hace con WebXR + Supabase. Riesgo legal alto. |

## Reglas que cualquier idea debe respetar
- La IA propone, el doctor (o recepción) firma.
- Nada inventado: ni métricas, ni predicciones, ni riesgos.
- Diagnóstico automático o guía quirúrgica = dispositivo médico regulado.
