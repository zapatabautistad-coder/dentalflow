# IA ambiental (ONYX) — arquitectura completa (borrador, 2026-10-11)

Diseño de Claude (arquitecto) para decidir **antes** de aplicar cualquier migración en
producción. Nada de esto está en producción. La migración 031 (consentimiento) está escrita
y probada en local, pero **no se aplica** hasta cerrar este diseño, porque puede cambiar.

> Datos sin verificar están marcados como **(verificar)**. Precios y políticas de los
> proveedores cambian; se confirman en sus páginas oficiales antes de firmar nada.

---

## 1. Qué es "IA ambiental" en DentalFlow: dos niveles

| | Nivel 1 — Dictado | Nivel 2 — Ambiental completo |
|---|---|---|
| Qué escucha | Solo al doctor, mientras activa ONYX (pedal o botón) | La conversación de la consulta (doctor y paciente) |
| Micrófono | Auricular manos libres, cerca de la boca | Micrófono de ambiente en el consultorio |
| Consentimiento | `dictado` | `ambiental` |
| Qué produce | Nota clínica u odontograma propuestos | Resumen de la consulta propuesto |
| Dificultad | Media | Alta: separar quién habla (diarización), ruido, audio largo |
| Riesgo legal | Bajo-medio | Alto (se graba al paciente) |

**Recomendación:** lanzar el Nivel 1 como la "actualización" que se vende a la primera
clínica. El Nivel 2 se diseña igual, pero se construye después, con pruebas reales y
revisión legal. Todo lo de abajo sirve para los dos niveles.

## 2. Flujo completo (Nivel 1)

```
Doctor (pedal/botón)
  └─ Navegador: graba solo mientras está activo
       · micrófono con noiseSuppression, echoCancellation, autoGainControl
       · corta silencios; si el volumen es bajo o hay mucho ruido, avisa y no envía
       · máximo 2 minutos por dictado
  └─ Servidor DentalFlow /api/onyx/transcribir  (nunca el navegador directo al proveedor)
       · sesión válida, rol doctor, clínica con ONYX activado
       · consentimiento vigente del paciente (la BASE lo verifica, no solo la app)
       · límites: tamaño, duración, dictados por minuto, tope de gasto por clínica
       · audio → Whisper (OpenAI) con vocabulario dental → texto
       · el audio NO se guarda en ningún lado
  └─ Pantalla: el doctor ve y corrige el texto transcrito
  └─ Servidor /api/onyx/ordenar
       · texto → Claude (Anthropic) con salida JSON fija
       · la respuesta pasa por validateDictation (odontograma) o validateNote (nota)
       · lo dudoso se vuelve pregunta, nunca se adivina
  └─ Pantalla de revisión: el doctor acepta, corrige o descarta cada punto
  └─ Al confirmar: se guarda con el flujo normal (clinical_entries / odontogram_entries),
     firmado por el doctor. La IA nunca escribe en tablas clínicas.
```

## 3. Base de datos (lo que hay que decidir antes de aplicar 031)

### 3.1 Consentimiento — migración 031 (escrita) + ajustes propuestos
- Ya tiene: alcance (`dictado` / `ambiental`), versión del texto, solo INSERT, auditoría,
  aislamiento por clínica.
- **Agregar antes de aplicarla:** función `has_ai_consent(patient, scope)` en la base, para
  que el servidor y los triggers comprueben el consentimiento vigente sin repetir lógica.

### 3.2 Activación por clínica — nueva
- `clinics.onyx_enabled` (falso por defecto). Solo el administrador de plataforma lo
  activa (es la "actualización" que se cobra). Sin esto, ONYX no aparece en pantalla.

### 3.3 Registro de sesiones de ONYX — nueva tabla `onyx_sessions`
Para saber qué hizo la IA en cada caso (trazabilidad clínica y control de costos).
- Paciente, doctor, alcance, consentimiento usado, segundos de audio, modelo usado.
- Texto transcrito, propuesta de la IA y qué aceptó el doctor (**decisión pendiente:
  ¿se guarda el texto transcrito?** Es dato clínico; ayuda a auditar errores de la IA).
- Solo INSERT y SELECT, auditada, aislada por clínica.
- **Trigger:** no deja crear una sesión sin consentimiento vigente (`has_ai_consent`).
- Las entradas clínicas que salgan de ONYX guardan `onyx_session_id` (columna opcional nueva
  en `clinical_entries` y `odontogram_entries`) para ver en la ficha "dictado con ONYX".

## 4. Proveedores

| Pieza | Proveedor propuesto | Notas |
|---|---|---|
| Voz a texto (Nivel 1) | Whisper de OpenAI | Robusto con ruido; puede inventar frases en silencios (por eso se cortan) |
| Voz a texto (Nivel 2) | Un servicio **con diarización** (separa doctor/paciente) | Whisper solo no separa voces. Comparar opciones con audio real **(verificar)** |
| Ordenar el texto | Claude de Anthropic | Salida JSON fija, validada por código |

- Contratos: pedir a ambos el acuerdo de tratamiento de datos y **retención cero**
  (que no guarden ni entrenen con el audio o el texto) **(verificar condiciones)**.
- Claves solo en el servidor (Vercel), nunca en el navegador.
- Opción futura: Whisper en servidor propio para que el audio no salga a terceros.

## 5. Seguridad
- La transcripción y la respuesta de la IA son **datos, no órdenes**: nada de lo que diga
  el paciente o la IA puede cambiar permisos ni ejecutar acciones.
- Nada de `dangerouslySetInnerHTML` con texto de la IA (React ya escapa).
- Los registros (logs) nunca guardan texto clínico ni audio.
- Tope de gasto mensual por clínica; si se pasa, ONYX se pausa con un aviso.
- Si el proveedor falla, el doctor sigue trabajando a mano: ONYX nunca bloquea la consulta.

## 6. Legal (Ley 172-13)
- Consentimiento por paciente, por alcance, revocable (031).
- Texto del consentimiento revisado por un abogado antes del primer paciente real.
- Contrato con la clínica que diga qué datos salen a terceros y para qué.
- No se dice "cumple HIPAA" ni nada parecido.

## 7. Calidad antes de vender
- Juego de prueba: 30 dictados reales en español dominicano (sin datos de pacientes reales),
  con lo que debió salir. Se mide cuántos dientes, superficies y condiciones acierta.
- Se prueba el auricular y el pedal recomendados en un consultorio con ruido real.
- Meta para lanzar (propuesta): ningún dato clínico guardado sin confirmación del doctor y
  todo error de la IA corregible antes de firmar.

## 8. Reparto (regla de CLAUDE.md: Claude diseña y revisa, Copilot construye)
1. **Claude:** cerrar este diseño; ajustar 031; escribir 032 (`onyx_enabled`, `onyx_sessions`,
   `has_ai_consent`, `onyx_session_id`); `validateNote`; prompt de Claude para ordenar.
2. **Copilot:** grabación en el navegador, pedal, pantallas de revisión, rutas `/api/onyx/*`.
   Claude escribe el prompt en `pendientes/06-prompts-para-agentes.md` y revisa el PR.
3. **Darys:** decisiones de la sección 9, contrato con proveedores, abogado, aplicar migraciones.

## 9. Decisiones pendientes de Darys
1. ¿Se lanza primero el Nivel 1 (dictado) y el Nivel 2 después?
2. ¿Se guarda el texto transcrito en `onyx_sessions`? (recomendado: sí, para auditar la IA)
3. ¿ONYX se vende como actualización pagada por clínica (`onyx_enabled`)?
4. ¿Quién dicta: solo el doctor, o también el asistente dental para notas?
5. ¿Cuándo se aplica en producción: con la primera clínica o antes?
