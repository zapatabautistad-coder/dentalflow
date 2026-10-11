# ONYX — identidad de la IA de DentalFlow (propuesta de Gemini, 2026-10-11)

ONYX es el nombre y la cara de toda la IA de DentalFlow. Es la visión de largo plazo y el
diferenciador de marca. **No existe en el código todavía**: el diseño está fuera del repositorio.

## Acordado
- **No grabar consultas** en la fase 1 (Ley 172-13, consentimiento, costo). La "IA ambiental"
  de esta etapa no es un micrófono en el consultorio.
- **Dictado por voz:** el doctor activa ONYX y dicta el resumen o el odontograma. No se graba al
  paciente. Base ya hecha: `src/lib/dictation.ts`. Sigue en pausa hasta la primera clínica real.
- La recepcionista telefónica (ElevenLabs v4 Turbo) es una mejora para después.
- Primero la facturación **e-CF** (con NCF, Ley 32-23; plazo del 15-nov-2026).

## Pendiente de decisión del fundador (choca con reglas de CLAUDE.md)
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
