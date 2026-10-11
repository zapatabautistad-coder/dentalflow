# Visión healthtech y salida internacional (2026-10-11)

Resumen técnico del plan. El plan completo (mercados, empresa, pagos, contratos, riesgos) está en el
PDF "DentalFlow — Plan de salida internacional" v1, que Darys guarda en privado: **este repo es
público**, así que aquí no va lo confidencial del negocio.

Marcas: **[REAL]** comprobado en código/base el 2026-10-11 · **[VISIÓN]** por construir ·
**[CONFIRMAR]** lo valida un abogado, contador o experto del país.

## Opinión técnica
La base es mejor que la de la mayoría de productos de salud en su etapa **[REAL]**: historia clínica
solo-agregar, nada clínico se borra, autor y fecha por la base, auditoría completa, RLS y MFA
exigidos por la base, multi-tenant terminado, E2E por rol, respaldo nocturno con restauración
completa probada (2026-10-11).

Lo que ata el producto a RD **[REAL]**: zona horaria `America/Santo_Domingo` fija (6 archivos),
RD$ fijo (6 archivos), cédula dominicana, ARS, solo es/en, datos en Supabase `us-west-2` (Oregón).

## Los 4 puntos para nivel healthtech mundial
1. **Estándares del sector**: HL7 FHIR, DICOM (radiografías), CDT y CIE-10 (hoy los procedimientos son
   texto libre). CDT requiere licencia de la ADA **[CONFIRMAR]**.
2. **Leyes de cada país**: factura electrónica (e-CF en RD), aseguradoras (ARS y equivalentes) y
   protección de datos (Ley 172-13, HIPAA, GDPR, LGPD…) **[CONFIRMAR]**.
3. **Funcionar sin internet** y sincronizar después (apagones, internet inestable).
4. **Función estrella que ahorre tiempo**: dictado por voz en español → odontograma y
   periodontograma (la IA propone, el doctor confirma).

Además: operación seria (ambiente de pruebas, monitoreo de errores, PITR, página de estado) y
certificaciones reales (SOC 2 / ISO 27001) cuando toque. Nunca se anuncia una certificación sin tenerla.

## Ruta por fases (cada punto de arriba tiene su lugar)
| Fase | Qué | Puntos que cubre |
|---|---|---|
| 0 · RD sólida | Primeras clínicas reales; e-CF (proveedor certificado) y ARS; importador de datos; ambiente de pruebas, monitoreo, PITR; Ley 172-13 y contratos; retomar dictado por voz con la primera clínica | 2, 4 y operación |
| 1 · Exportable | Configuración por clínica (zona horaria, moneda, documento, idioma, impuestos); módulo fiscal por país; adaptadores de aseguradoras; CDT/CIE-10; FHIR; DICOM; **modo sin internet**; dictado por voz | 1, 2, 3, 4 |
| 2 · Primer país | Puerto Rico o un país hispano cercano, con abogado y contador locales | 2 |
| 3 · Región | Latinoamérica hispana y España; evaluar Brasil (portugués cambia la regla de idiomas) | 2 |
| 4 · EE. UU. / Europa | HIPAA con BAA, GDPR, SOC 2 / ISO 27001; integrar IA de radiografías aprobada | 2 y certificaciones |

Criterio para pasar de fase: lo fija Darys con datos reales (sin cifras inventadas).

## Innovación que ahorra tiempo **[VISIÓN]**
| Idea | Ahorro | ¿Existe? |
|---|---|---|
| Dictado por voz → odontograma/periodontograma | ~192 números del periodontograma | En inglés sí; en español con flujo RD casi no. En pausa hasta la primera clínica real (`11-multi-tenant.md`) |
| Predecir rechazo de ARS antes de reclamar | Menos devoluciones | Poco en Latinoamérica; lo protegen los datos propios |
| Historia clínica con sello criptográfico encadenado | Prueba legal de no alteración | Técnica conocida, poco común en odontología |
| Agenda que predice inasistencias + WhatsApp | Más sillas ocupadas | Existe en parte |
| Análisis de radiografías con IA | Detecta caries y pérdida ósea | Ya existe y aprobado por FDA (Overjet, Pearl, VideaHealth): integrar, no competir |
| Seguimiento de planes, copiloto de radiografías, gemelo digital | — | Ya en la ruta de `11-multi-tenant.md` (puntos 3, 4 y 5) |
| Importador de datos, portal del paciente | Cambio rápido de sistema, menos llamadas | Común; necesario para vender |

## Patentes, marca y hardware
- Una IA no puede ser inventora; el inventor sería Darys. El software "como tal" se excluye en RD y
  muchos países **[CONFIRMAR]**; en EE. UU. solo si mejora la tecnología. Si una idea lo amerita,
  solicitud provisional en EE. UU. (reserva la fecha 12 meses) con abogado de patentes.
- Lo que protege: datos propios, integraciones locales, velocidad y confianza de las clínicas.
- Marca "DentalFlow": registrar en ONAPI y verificar disponibilidad en cada país antes de salir.
- Hardware: no fabricar; conectarse con los equipos que la clínica ya tiene (DICOM).

## Hallazgos de infraestructura (2026-10-11)
- **Repo público**: `pendientes/`, migraciones y reglas de seguridad están a la vista. Para hacerlo
  privado sin romper nada hace falta **GitHub Pro**: en el plan gratis, un repo privado pierde los
  Environments (el respaldo nocturno fallaría), la protección de `main` y tendría 2.000 minutos de
  Actions al mes (hoy se gastan más). CodeQL y el escaneo de secretos se pierden igual **[CONFIRMAR]**.
- **Vercel**: la cuenta no tiene equipos, casi seguro plan Hobby (uso no comercial). Pasar a Pro antes
  de la primera clínica que pague **[CONFIRMAR]**.
- `dentalflow-demo` contiene una copia de datos reales desde la prueba de restauración (2026-10-11).

## Decisiones pendientes de Darys
Metas de la fase 0 · contador (e-CF, ITBIS) · abogado (Ley 172-13, contratos) · consentimiento para
enviar datos a la IA · primer país · marca · repo privado + GitHub Pro · Vercel Pro · qué hacer con
la copia de datos reales en demo.
