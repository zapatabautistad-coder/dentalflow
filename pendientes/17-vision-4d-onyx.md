# 17 · Visión: modelo 4D y ONYX (IA ambiental)

Estado: **visión de Darys (2026-10-16), nada construido.** La imagen del "DentalFlow Engine: 4D Simulation" es solo un mockup. No usar sus cifras ("Simulation stability 99.7%", "Reliability 100%") fuera de un mockup interno: son inventadas.

## 1. La visión (palabras de Darys, resumidas)

- **Modelo 4D** = modelo 3D de la boca y la mandíbula + tiempo. Cada tomografía (CBCT) o radiografía nueva se aplica sola al modelo. El doctor puede "abrir la boca", ver dentro del diente y revisar la mandíbula; un deslizador recorre el tiempo (T+1m, T+2m…).
- **IA predictiva** aplica los hallazgos al modelo y crea un **aviso de posible diagnóstico, nunca definitivo**. Lo define por completo el doctor. Regla universal de la app.
- **ONYX** (nombre provisional, revisar marca): IA ambiental por voz, manos libres. Palabra de activación con tono; "ONYX, vista interior del molar 36, zoom" → la imagen aparece y la anomalía se marca en rojo en el monitor. Registra los hallazgos en un **borrador** que el doctor confirma, y luego imprime o envía.
- **Lápiz intraoral portátil**: cámara de alta resolución con infrarrojo (caries internas, infección de encía). Al detectar, graba, envía a DentalFlow, se ve en el modelo 4D y se guarda solo.
- **Objetivo de negocio**: menos tiempo en sala de espera, más pacientes. Hipótesis: 10–15 min ahorrados por paciente (escribir, recetar, llamar al siguiente, cobrar). **Hipótesis no medida**: medirla en una clínica real antes de prometerla.

## 2. Qué existe hoy en el mercado (para decidir comprar o construir)

| Pieza | ¿Existe? | Decisión |
|---|---|---|
| Cámara intraoral NIR (transiluminación) | Sí, equipos aprobados por la FDA | Alianza con fabricante; no construir hardware propio al inicio |
| IA sobre CBCT/radiografías | Sí, varios proveedores | Integrar por API primero |
| Borrador de nota por voz (ambient scribe) | Sí | Integrar o construir sobre un servicio con contrato |
| Modelo 3D con actualización automática en el tiempo | Parcial | I+D propia; el diferencial real |
| Simulación biomecánica / "celular" | No validada | Última fase; no prometer |

## 3. Reglas innegociables

1. **Toda salida de IA es una sugerencia**, guardada aparte del registro clínico, con modelo, versión y confianza. Solo el doctor la convierte en registro (entrada firmada por él, con autor y fecha puestos por la base). Descartar también queda registrado.
2. **Solo agregar**: imágenes y hallazgos siguen el patrón de `clinical_entries` (INSERT y SELECT, `audit_row`, RLS restrictiva por `clinic_id`, sin DELETE). Un error se corrige con otra entrada.
3. **Ninguna imagen ni audio de paciente sale a una IA externa** sin contrato firmado con ese proveedor (acuerdo de procesamiento de datos; BAA si hay pacientes de EE. UU.) y consentimiento del paciente para la voz.
4. **Regulación**: HIPAA es privacidad. Lo que regula una IA que sugiere diagnósticos es la **FDA** (software como dispositivo médico) y las normas de cada país. Empezar como visualización y borrador reduce el riesgo; consultar a un asesor regulatorio antes de la fase 3.
5. Métricas en pantalla o ventas solo reales (sensibilidad y especificidad medidas), nunca "100%". Sin "HIPAA compliant" ni certificaciones no obtenidas.
6. El diseño de la app sigue congelado (cristal claro, azul cielo). El estilo oscuro del mockup es solo del mockup.

## 4. Arquitectura objetivo

| Capa | Función | Cómo |
|---|---|---|
| Captura | Lápiz NIR, CBCT, radiografías, voz | Alianza de hardware; entrada estándar DICOM |
| Almacén de imágenes | Guarda cada captura (paciente, diente, fecha, autor) sin borrado | Tabla nueva solo INSERT/SELECT + almacenamiento de archivos con acceso firmado por clínica |
| Motor 3D | Malla de dientes, hueso, nervio y mandíbula desde CBCT | Proveedor externo primero; modelo propio después |
| Eje temporal | Registro de cada imagen nueva contra el modelo anterior; versiones por fecha | El deslizador lee versiones guardadas; la base ya conserva la historia |
| IA de hallazgos | Zonas sospechosas con confianza y fuente | Tabla de **sugerencias**, nunca el registro clínico |
| Confirmación | Aceptar, descartar o corregir | Aceptar crea la entrada firmada por el doctor |
| ONYX (voz) | Palabra de activación local, comandos de pantalla, borrador de nota, receta y cobro | Detección de palabra clave en el dispositivo; transcripción con contrato; mismos permisos por rol que la app |

## 5. Fases

| Fase | Qué | Requisito |
|---|---|---|
| 0 | Línea de tiempo por diente con lo que ya guarda `odontogram_entries` | Ninguno; sin cambiar el esquema |
| 1 | Subir y ver radiografías y fotos del paciente | Tablas nuevas (sección 6) |
| 2 | Borrador de nota por voz que el doctor confirma | Contrato con proveedor de voz y consentimiento |
| 3 | IA que sugiere hallazgos en radiografías | Contrato y revisión regulatoria |
| 4 | Visor 3D de tomografías (DICOM) | Almacenamiento y costos por clínica |
| 5 | Modelo 4D completo y lápiz ONYX | Alianza de hardware |

Recomendación: empezar por las fases 0 y 2. Dan valor visible a una clínica real sin hardware y generan la tracción que más sube la valorización.

## 6. Diseño de la fase 1 (para el prompt de Copilot)

Tablas nuevas (migración siguiente a 033; antes revisar el esquema real en producción):

- `patient_images`: `id`, `clinic_id`, `patient_id`, `appointment_id` (opcional, del mismo paciente), `tooth` (FDI, opcional), `kind` (`radiografia`, `foto`, `intraoral`), `storage_path`, `mime_type`, `size_bytes`, `author_id`, `author_role`, `created_at`, `corrects_entry_id` y `correction_reason` para anular con otra entrada. Autor, rol y fecha por trigger `stamp_*`. Solo INSERT y SELECT. `audit_row`. GRANT a `authenticated`. Políticas: restrictiva por `clinic_id`; escriben doctor y asistente dental; leen todos los roles que ya leen la ficha.
- `ai_suggestions`: `id`, `clinic_id`, `patient_id`, `image_id`, `tooth`, `finding` (texto corto), `confidence` (0–1), `source` (modelo y versión), `created_at`, `status` (`pendiente`, `aceptada`, `descartada`), `reviewed_by`, `reviewed_at`. Solo el doctor cambia `status`; la base pone `reviewed_by`/`reviewed_at`. Sin DELETE, con `audit_row`. Aceptar crea una entrada en `clinical_entries` firmada por el doctor.
- Almacenamiento privado (Supabase Storage), carpeta por `clinic_id/patient_id`, política que exige la misma clínica y rol, enlaces firmados de corta duración, sin lectura pública.
- Pruebas E2E por rol (Supabase local): otra clínica no ve las imágenes; recepción no ve imágenes clínicas si así se decide; nadie borra.

Pendiente de decidir con Darys: qué roles ven imágenes (recepción sí o no), límite de tamaño por archivo, política de retención y el proveedor de almacenamiento a largo plazo.

## 7. Riesgos abiertos

Regulación del software de diagnóstico; datos anotados para entrenar un modelo propio; costo y tamaño de las tomografías; privacidad del audio en sala; marca ONYX sin búsqueda; hipótesis de ahorro de tiempo sin medir.
