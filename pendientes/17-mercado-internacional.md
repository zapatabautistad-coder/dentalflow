# DentalFlow fuera de República Dominicana (2026-10-11)

Meta de Darys: comercializar DentalFlow fuera de RD. Cada mercado tiene su ley de datos de
salud. **Regla: nunca decir "cumple HIPAA" (ni otra ley) sin auditoría que lo respalde.**
Datos de proveedores marcados (verificar) se confirman en sus páginas oficiales.

## Leyes por mercado
| Mercado | Ley de datos de salud | Notas |
|---|---|---|
| República Dominicana | Ley 172-13 | Mercado actual |
| **Puerto Rico** | **HIPAA** (territorio de EE. UU.) | Habla español: el puente natural hacia EE. UU. |
| Estados Unidos | HIPAA (+ leyes estatales) | El más exigente y el más grande |
| España / Unión Europea | RGPD | Derecho de borrado con excepciones para historia clínica |
| México | LFPDPPP | Factura electrónica CFDI |
| Colombia | Ley 1581 | Factura electrónica DIAN |

## HIPAA: qué exige de verdad (no es un sello, es un programa)
DentalFlow sería "socio comercial" (business associate) de cada clínica de EE. UU./PR.
1. **Contratos BAA** con la clínica y con cada proveedor que toque datos de salud: Supabase,
   Vercel, OpenAI, Anthropic, respaldo. Varios los ofrecen solo en planes empresariales (verificar).
2. **Análisis de riesgos** escrito y actualizado.
3. **Políticas**: acceso, contraseñas, incidentes, respaldo, retiro de empleados.
4. **Aviso de brechas** en plazos definidos por la ley.
5. **Capacitación** del equipo.
6. **Salvaguardas técnicas**: control de acceso, auditoría, cifrado, respaldo, MFA.

## Lo que DentalFlow ya tiene (punto 6)
Aislamiento por clínica (RLS), auditoría de todo cambio, nada clínico se borra, MFA para admin y
doctor, respaldo nocturno cifrado, cierre por inactividad, consentimiento para IA (031).

## Lo que falta para salir de RD
- Puntos 1–5 de HIPAA (contratos, análisis de riesgos, políticas, brechas, capacitación).
- Auditoría externa; después, certificación (SOC 2 o ISO 27001) cuando se obtenga.
- Elegir dónde viven los datos por país (residencia de datos).
- Factura electrónica de cada país.
- Revisión legal en cada mercado.

## Orden sugerido
RD (piloto y primeras clínicas) → Puerto Rico (español + HIPAA) → EE. UU. hispano → resto de
Latinoamérica y España.
