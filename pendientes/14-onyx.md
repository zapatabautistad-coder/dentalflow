# ONYX — identidad de la IA de DentalFlow (propuesta de Gemini, 2026-10-11)

**Estado: propuesta a futuro** (lo aclaró el fundador el 2026-10-11). No cambia la prioridad actual
ni se implementa nada hasta que él lo pida.

ONYX es el nombre y la cara de toda la IA de DentalFlow. Es la visión de largo plazo y el
diferenciador de marca. **No existe en el código todavía**: el diseño está fuera del repositorio.

## Acordado
- **No grabar consultas** en la fase 1 (Ley 172-13, consentimiento, costo). La "IA ambiental"
  de esta etapa no es un micrófono en el consultorio.
- **Dictado por voz:** el doctor activa ONYX y dicta el resumen o el odontograma. No se graba al
  paciente. Base ya hecha: `src/lib/dictation.ts`. Sigue en pausa hasta la primera clínica real.
- La recepcionista telefónica (ElevenLabs v4 Turbo) es una mejora para después.
- Primero la facturación **e-CF** (con NCF, Ley 32-23; plazo del 15-nov-2026).

## A decidir cuando se retome (choca con reglas de CLAUDE.md)
1. **Ícono de ónice negro:** el diseño está congelado ("sonrisa limpia y brillante", sin azul
   oscuro pesado; el teal es solo para la IA). Hace falta una orden explícita para cambiarlo y
   decidir cómo encaja con la paleta.
2. **"IA viva que monitorea la clínica":** solo se muestra si de verdad hace algo con datos
   reales de Supabase. Un ícono que late sin función es un elemento que no hace nada (prohibido).
3. **WhatsApp antes de la primera clínica:** contradice la pausa de la IA hasta la primera clínica
   (por costo). Requiere además verificación de Meta Business, plantillas aprobadas (fuera de la
   ventana de 24 h no hay texto libre) y consentimiento del paciente.
4. **"Triaje" por WhatsApp:** la IA no decide nada clínico. Solo puede agendar, responder datos
   de la clínica y pasar a recepción; ante dolor fuerte, sangrado o hinchazón, remite a una persona
   o a emergencias, sin diagnosticar.

## Orden recomendado por Claude
1. e-CF → 2. primera clínica piloto (sin ONYX) → 3. ONYX en WhatsApp: agendar y captar pacientes,
con recepción aprobando → 4. dictado → 5. recepcionista telefónica → 6. IA ambiental con
consentimiento.

## Arquitectura propuesta para el dictado (Gemini, 2026-10-11)
- **Whisper (OpenAI) = oídos:** audio → texto. **Claude = cerebro:** texto → propuesta estructurada.
- Reglas al construirlo:
  - Claude **propone**, nunca escribe en la base. La propuesta pasa por `validateDictation`
    y el doctor confirma y firma con el flujo normal (registro clínico y odontograma).
  - Whisper puede **inventar frases** en silencios o ruido. El texto transcrito se le muestra
    al doctor antes de procesarlo, y hay que probarlo con dictados reales en español dominicano.
  - El audio va del navegador al servidor y de ahí a la API; **no se guarda**.
  - Son dos terceros (OpenAI y Anthropic): el consentimiento del paciente (paso 1) debe
    nombrarlos a ambos.
  - Opción futura: Whisper en un servidor propio, para que el audio no salga a un tercero.

## Micrófono y ruido (decisión del fundador, 2026-10-11)
- El doctor usa **auricular manos libres con micrófono muy cerca de la boca**.
- Reglas contra el ruido:
  - El navegador pide el micrófono con `noiseSuppression`, `echoCancellation` y `autoGainControl`.
  - Solo se graba mientras el doctor activa ONYX, **nunca escucha continua**.
  - Se cortan los silencios antes de enviar el audio a Whisper, porque ahí es donde inventa frases.
  - Si el volumen es bajo o hay demasiado ruido, se avisa y no se envía.
  - Se le pasa a Whisper una lista de vocabulario dental (FDI, superficies, condiciones) para
    que entienda mejor la jerga.
- Hardware: preferir auricular USB con cable o inalámbrico de 2,4 GHz. Bluetooth en modo
  llamada baja la calidad del audio. Probar antes de recomendarlo a la clínica.
- Con guantes: activar con **pedal USB** (actúa como una tecla). Una palabra de activación
  ("ONYX") exige escuchar todo el tiempo: eso ya sería IA ambiental y necesita consentimiento.
- Aunque el micrófono esté cerca, puede captar al paciente o su nombre: el consentimiento sigue
  siendo necesario.

## Avance
- **Paso 1 — consentimiento del paciente: hecho en código (2026-10-11)**, migración 031 y sección
  en la ficha. Falta: aplicar 031 en producción (lo decide el fundador) y que un abogado revise el
  texto v1 antes de usarlo con pacientes reales.
- Paso 2 — dictado (Whisper + Claude): pendiente.
