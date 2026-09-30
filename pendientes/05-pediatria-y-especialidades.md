# Clínica multiespecialidad: base de especialidades + Pediatría (PROPUESTA, sin iniciar)

**Estado:** propuesta para revisar. No se ha escrito código ni migraciones. No iniciar sin confirmación del dueño del proyecto.

**Decisiones ya tomadas (dueño del proyecto):**
- Mercado: República Dominicana y Estados Unidos. Una instancia por cliente (cada clínica con su propia base y sitio).
- Empezar por **clínica multiespecialidad**, no hospital (hospitalización, camas, laboratorio, farmacia y quirófano quedan para una fase posterior).
- Primera especialidad nueva: **Pediatría** (Odontología ya existe a medias).
- Esquemas de vacunas: **ambos**, el de EE. UU. (CDC) y el de República Dominicana (MSP).

## Idea central
Un **núcleo común** (pacientes, citas, sala de espera, cuentas, auditoría, registro clínico) y **módulos por especialidad** encima. Un doctor pertenece a una o varias especialidades y solo ve las ramas que tiene asignadas. Las especialidades son **datos**, no código: agregar una no exige reescribir la app.

## Fase 1 · Base de especialidades
- Tabla `specialties` (código, nombre ES/EN, activa).
- Tabla `doctor_specialties` (doctor ↔ especialidad).
- Interfaz general con sub-ramas: el menú muestra los módulos de las especialidades del usuario.
- Cita y consulta llevan la especialidad.

## Fase 2 · Pediatría (versión 1)
1. **Responsables del menor**: tabla `patient_guardians` (nombre, parentesco, teléfono, si puede dar consentimiento). La edad se muestra en días, meses y años.
2. **Antecedentes de nacimiento**: semanas de gestación, peso al nacer, tipo de parto, Apgar.
3. **Control de niño sano**: medidas de crecimiento por visita (peso, talla o longitud, perímetro cefálico, IMC) en `growth_measurements`.
4. **Carnet de vacunas**: `immunization_records` (dosis puestas) contra un esquema por país.
5. **Gráficas de percentiles** a partir de las medidas.
6. Fuera de la v1: hitos del desarrollo, calculadora de dosis por peso.

## Reglas de la base (las mismas del proyecto)
Toda tabla clínica nueva: trigger `audit_row`, **sin DELETE**, `GRANT` a `authenticated`, autor y fecha puestos por triggers, RLS por rol y por especialidad. Las medidas y las dosis aplicadas son **solo INSERT y SELECT** (un error se corrige con otra fila que apunte a la anterior con motivo, como en `clinical_entries`). Escriben solo doctor y enfermería.

## Tablas de referencia (no inventar datos)
- **Percentiles**: tablas oficiales LMS de la OMS (menores de 2 años) y de los CDC (2 años o más, EE. UU.). Tabla `growth_reference` con fuente y versión de cada fila.
- **Esquemas de vacunas**: tabla `immunization_schedule` por país (`US`, `DO`) con vacuna, dosis, edad mínima y recomendada, **fuente y fecha de la versión**. Los valores se cargan desde las fuentes oficiales (CDC y Ministerio de Salud Pública de RD); si un valor no se puede confirmar, no se carga.
- **Un pediatra debe revisar** las plantillas, los cálculos y los esquemas antes de usarse con niños reales.

## Riesgos y puntos abiertos
- **Calculadora de dosis por peso**: la función más pedida y la más riesgosa; un error puede dañar a un niño. Dejarla fuera de la v1, o solo como ayuda claramente marcada y revisada por un pediatra.
- **Quién ve qué entre especialidades**: decisión clínica y legal pendiente. Propuesta: todos ven lo esencial (alergias, medicamentos, diagnósticos activos) y solo la rama ve el detalle completo, con acceso de emergencia registrado. En EE. UU. lo define HIPAA: consultar con un especialista antes del primer cliente.
- **Consentimiento y privacidad de menores**: reglas distintas por país y por estado. Confirmar con asesor legal.
- **HIPAA (EE. UU.)**: contratos BAA con cada proveedor que toque datos (base de datos, hosting, correo, SMS), planes adecuados y autenticación en dos pasos para el personal, antes de cualquier paciente real de EE. UU. No afirmar cumplimiento sin haberlo logrado.
- **Idioma**: inglés por defecto para EE. UU., español para RD, según el cliente (solo español e inglés).

## Cómo trabajar
Rama nueva, PR pequeños. Yo hago las pantallas y un agente Opus escribe las migraciones de la base (revisando antes el esquema real, solo con herramientas de lectura). **Nada se aplica en producción sin aprobación del dueño.**

## Bloqueado por
- Confirmar la lista de especialidades del primer cliente.
- Un pediatra que revise plantillas, tablas y esquemas.
- Decisión sobre visibilidad entre especialidades.
