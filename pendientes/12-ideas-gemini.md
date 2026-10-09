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
| **NCF / e-CF (DGII) — tabla aparte `fiscal_invoices`** | Bien: el libro interno (`billing_*`) queda universal y lo fiscal va en tabla satélite por país. Ajustes: el NCF va en **columna** con único `(clinic_id, ncf)`, no solo dentro del JSONB; rangos autorizados por tipo y vencimiento en otra tabla (`fiscal_sequences`); RNC **opcional** (consumidor final no tiene); ligar a cargos, no solo a un pago (los abonos son parciales); `country_code` sale de la clínica, no se repite; solo INSERT + anular con motivo + auditoría. e-CF exige XML firmado: usar un proveedor certificado por la DGII. Diseñar para e-CF (E31, E32…). Confirmar ITBIS en servicios de salud con un contador. |
| **Tipo de documento del paciente (`document_type`)** | Útil ya en RD: extranjeros con pasaporte y menores sin cédula. La validación módulo 10 solo aplica si es cédula. |
| **Perfil "genérico" para otros países** | De acuerdo con la estrategia: RD completo; otros países sin cédula/ARS/NCF y con recibo simple; integraciones fiscales solo cuando haya clientes allí. **No** renombrar ya `ars_*` a `insurance_*` en la base: es caro y no aporta hasta tener un segundo país; basta cambiar la etiqueta en pantalla. Nunca guardar SSN de EE. UU. |
| **Seguimiento de planes pendientes (borrador de WhatsApp con IA)** | Es el punto 3 de la ruta. La IA solo redacta; recepción **siempre** aprueba (no lo decide el modelo). Sin presión, sin inventar riesgos, sin nombrar el procedimiento ni precios. WhatsApp Business no permite texto libre fuera de 24 h: usar enlace `wa.me` desde la clínica. Consentimiento y "no me escriban" (Ley 172-13). Registro de contactos solo INSERT. Botón en teal (IA). Prompt corregido en la conversación del 2026-10-09. |
| **Respaldos de la base (urgente con pacientes reales)** | Hoy no hay plan de respaldo verificado. Point-in-Time Recovery es un extra de pago de Supabase (requiere plan Pro). Mínimo: plan Pro con respaldos diarios y **probar una restauración** en el proyecto demo. Nada de "caché de historiales": los datos son pocos y cachear datos clínicos agrega riesgo de privacidad y de mostrar datos viejos. Observación: la base está en `us-west-2` (Oregón); `us-east-1` queda más cerca de RD. Mover de región es costoso; solo si la lentitud se nota. |
| **Cobro de la suscripción a las clínicas** | Hueco real. Depende del multi-tenant (`clinics.active` ya está en el borrador 029). Verificar qué pasarela opera en RD antes de elegir (Stripe no está disponible para todo país; alternativas locales como Azul o CardNet, o un "merchant of record"). Si una clínica no paga: **modo solo lectura**, nunca cortar el acceso a expedientes clínicos de golpe (obligación legal de conservarlos y entregarlos). |
| **Conseguir clínicas (ventas)** | Empezar en **RD**, no en México/Colombia/Costa Rica: ahí está el producto completo (cédula, ARS, idioma). Primeros clientes por contacto directo y referidos entre dentistas. Correo masivo automatizado: cuidado con leyes de spam y con la reputación del dominio. |

## B. Visión (no antes de tener clínicas pagando)

| Idea | Opinión / cuidado |
|---|---|
| CAD/CAM e impresión 3D | Rescatable: adjuntar `.STL` del escáner y enviarlos al laboratorio. Diseñar coronas/guías es software regulado; el navegador no imprime directo sin un agente local. |
| T-Scan (fuerza de mordida) | "Se fracturará en 6 meses" sería una predicción inventada. Requiere acuerdo con el fabricante. Nicho. |
| Fluorescencia (DIAGNOdent) | Rescatable: registrar la lectura con su fuente y que el doctor firme. Nunca "cero subjetividad" ni entradas automáticas. Web Bluetooth no funciona en iPhone. |
| Realidad mixta en cirugía | Es navegación quirúrgica certificada; no se hace con WebXR + Supabase. Riesgo legal alto. |

## Correcciones a Gemini
- "La base técnica, la escalabilidad y la operación internacional están cubiertas": falso hoy. El multi-tenant es un borrador sin aplicar y no hay país por clínica.
- "Configurar pruebas E2E": ya existen (Playwright, por rol, en `e2e/`). Lo que falta son las de **aislamiento entre clínicas** (tarea 5 de `11-multi-tenant.md`).
- "La auditoría te pone 80 % adelante en cualquier país" es una cifra inventada. HIPAA o RGPD exigen además contratos (BAA), cifrado, retención y derechos del paciente.

## Reglas que cualquier idea debe respetar
- La IA propone, el doctor (o recepción) firma.
- Nada inventado: ni métricas, ni predicciones, ni riesgos.
- Diagnóstico automático o guía quirúrgica = dispositivo médico regulado.
