# Hoja de ruta clínica: lo que falta para un nivel superior (2026-10-12)

**Estado:** propuesta para revisar. No se ha escrito migración ni código. No iniciar sin OK de Darys.

Origen: lectura de las 32 migraciones (SQL completo), contraste con la opinión de Gemini y
búsqueda de referentes (Overjet, Pearl, VideaHealth, Denti.AI, Dentrix Ascend). Claude solo leyó el SQL:
no ejecutó nada ni revisó la app. Marcas: **[REAL]** comprobado en el SQL o el código ·
**[VISIÓN]** por construir · **[CONFIRMAR]** lo valida un abogado, contador o clínico.

Lo que **ya está** en otros archivos no se repite aquí: consentimientos y radiografías
(`09`, `12`), NCF/e-CF como tabla aparte `fiscal_invoices` (`12`), `is_preexisting` (`12`),
sillón (`09`), pediatría y tutores (`05`), dictado por voz (`11`, `13`), sello encadenado, FHIR/CDT/DICOM (`13`).

## Lo urgente
- **e-CF (DGII) [CONFIRMAR]:** un portal contable (mayo 2026) dice que micro, pequeños y no clasificados
  tienen hasta el **15-nov-2026**. Hoy `09` lo tiene "bloqueado hasta hablar con un contador": hablar ya,
  y confirmar en la DGII la categoría de cada clínica. Los números de comprobante no son los `receipt_number`.
- **Consentimiento para grabar y procesar con IA [CONFIRMAR]:** antes de cualquier dictado o escriba ambiental
  (Ley 172-13). Sumar al diseño de consentimientos de `12`: tratamiento, grabación/IA y datos, con tutor si es menor.

## Brechas nuevas en la base [REAL]
1. **No existe la "consulta" (`encounters`).** `clinical_entries` y `odontogram_entries` no tienen `appointment_id`;
   solo `vital_signs` y `prescriptions` lo tienen. Sin consulta no hay dónde anclar una visita completa ni la IA.
2. **El procedimiento realizado está desconectado.** Plan (`treatment_plan_items`), nota tipo `procedimiento`
   (texto libre), odontograma y cargo no se enlazan. Completar un ítem no crea hallazgo, nota ni cobro.
3. **Pagos sin cargo:** `billing_payments` no se liga a `billing_charges`; no hay saldo, devoluciones, descuentos ni impuestos.
   ARS solo tiene estados: faltan lotes de reclamación, monto aprobado, motivo de rechazo (glosa) y catálogo de ARS.
4. **Historial médico:** recepción puede editarlo (política de la 009). Faltan ASA, marcapasos/válvulas (profilaxis),
   y reconfirmar las alertas en cada consulta. Las recetas no se cruzan con alergias ni anticoagulantes.
   `vital_signs` no tiene peso ni talla (dosis pediátricas y máximo de anestésico).
5. **Proveniencia de IA:** la base sella autor y rol como el usuario que guarda; un borrador de IA confirmado
   sería igual a una nota manual. Hace falta `source` y `ai_draft_id`.
6. **Auditoría solo de escrituras:** nadie registra quién *leyó* un expediente. La cédula está en texto plano en el esquema.
7. **Permisos:** los roles están como listas literales en decenas de políticas. Faltan higienista, laboratorio y contador.
   Una matriz de permisos evita tocar todas las políticas al añadir un rol.
8. **Escala:** `audit_log` sin particionar y con la fila completa en `jsonb`.
9. **Menor:** `queue.queue_date default current_date` usa la zona del servidor. La app ya envía la fecha
   explícita (`waiting-room/actions.ts`), así que hoy no falla; `12` ya pide dejarla fuera del UTC.

## Orden propuesto (una tarea por sesión)
Reparto como siempre: **Claude** = base y revisión; **Copilot** = pantallas y pruebas, solo después de aplicada la migración.

| # | Tarea | Quién | Depende de |
|---|---|---|---|
| 1 | Hablar con el contador (e-CF, ITBIS) y el abogado (consentimiento IA, firma) | Darys | — |
| 2 | Migración `encounters` + `procedures_performed` (un RPC transaccional, como `create_prescription`, que crea hallazgo, nota y cierra el ítem del plan) | Claude (OK antes de aplicar) | — |
| 3 | Consentimientos + tutor (ver `05` y `12`) | Claude base, Copilot pantalla | 2 |
| 4 | Historial médico: solo clínicos editan; reconfirmación por consulta; peso/talla en signos vitales; alertas receta ↔ alergias/anticoagulantes | Claude base, Copilot pantalla | 2 |
| 5 | Periodontograma real (6 sitios por diente: sondaje, sangrado, recesión, supuración, movilidad, furca; solo INSERT) | Claude base, Copilot pantalla | 2 |
| 6 | Pago ↔ cargo (saldo) y ARS por lotes con glosas | Claude base, Copilot pantalla | 1 |
| 7 | Auditoría de lecturas y cifrado de cédula/teléfono | Claude | — |
| 8 | Borradores de IA (`ai_sessions`, `ai_drafts`): la IA propone, el doctor confirma, y recién entonces se crean las entradas inmutables con `source = 'ia_confirmada'` | Claude base, Copilot pantalla | 2, 3 y primera clínica real |
| 9 | Matriz de permisos y rol higienista; `audit_log` particionado; pruebas de aislamiento (pgTAP) | Claude | — |

## Visión (no antes de tener clínicas pagando) **[VISIÓN]**
- **Imágenes:** tabla de estudios + visor web (OHIF/Cornerstone) ligado al diente. IA de radiografías: **integrar**
  (Overjet, Pearl, VideaHealth, Denti.AI tienen aprobación FDA), no construir. Su estatus como dispositivo médico en RD **[CONFIRMAR]**.
- **Periodoncia:** estadiaje y grado según la clasificación de 2018, calculados por el sistema y firmados por el doctor.
- **Apoyo a decisiones clínicas:** máximo de anestésico por peso, profilaxis antibiótica y alertas por condición.
  Un clínico asesor debe validar cada regla; nunca se muestran como diagnóstico.
- **Laboratorio:** órdenes ligadas al procedimiento con estados, y aviso si la cita llega antes de la pieza. Inventario por lote y esterilización.
- **Seguimiento:** recall configurable, indicaciones postoperatorias, lista de espera, historial de mensajes y consentimiento de contacto.
- **Portal del paciente** con autenticación separada del personal.

## Notas sobre la opinión de Gemini
- "Aislamiento impecable" e "inmutabilidad legal": es sólido, pero hay brechas (arriba). La inmutabilidad es por permisos,
  no criptográfica; `service_role` puede alterar.
- Firma en tablet **[CONFIRMAR]**: la Ley 126-02 (texto de INDOTEL) da validez a documentos digitales y equipara la
  **firma digital** (con entidad certificadora) a la manuscrita; lo demás se valora por confiabilidad e integridad.
  Una firma dibujada con hash, IP y hora es buena evidencia, no equivale automáticamente a firma digital.
- Ya existe un escriba ambiental dental (VideaHealth "Voice Notes", oct 2025) y periodoncia por voz (DentScribe):
  la ventaja es datos **estructurados** (odontograma, periodontograma, plan) en español, no solo la nota.

## Reglas que cualquier tarea de aquí debe respetar
- Toda tabla clínica: `audit_row`, sin DELETE, `GRANT`, autor y fecha por trigger, RLS por rol y clínica.
- La IA propone y el doctor firma. Nada inventado, nada de "cumple HIPAA" ni certificaciones sin tenerlas.
- Migración nueva siempre en archivo nuevo; revisar el esquema real de la base antes de escribirla.
