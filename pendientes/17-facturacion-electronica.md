# Facturación electrónica (e-CF, DGII)

**⏸ EN PAUSA (decisión de Darys, 2026-10-16): requiere inversión (proveedor, certificados, homologación). Se retoma cuando haya presupuesto.**

Decisiones y datos al 2026-10-16. Diseño previo de la tabla: `12-ideas-gemini.md` (fila NCF / e-CF).

## Datos (aportados por Darys; fuentes DGII y blogs del sector)
- Servicios odontológicos **exentos de ITBIS** (Ley 11-92, art. 344). El e-CF se emite igual, con ITBIS exento.
- Plazo para pequeños, micro y no clasificados: **15-nov-2026**.
- Emite cada **clínica** (autorizada por la DGII), no DentalFlow.
- Tipos que usa una clínica: **32** consumo (paciente), **31** crédito fiscal (empresa con RNC y **ARS**), **34** nota de crédito (anulación).
- Número: `E` + tipo (2) + secuencia (10) = 13 caracteres. No es `receipt_number`.
- Estados DGII: Aceptado, Aceptado Condicional, Rechazado, En Proceso. Solo los aceptados valen.

## Decisión de arquitectura
- **Motor con adaptadores:** DentalFlow arma el comprobante (31/32/34, exento de ITBIS, estados) y lo envía por un adaptador. Adaptador 1: proveedor autorizado (para cumplir plazos). Adaptador 2: homologación propia con la DGII (TesteCF desde la Oficina Virtual, credenciales en 3–10 días laborables), meta a largo plazo: DentalFlow emisor para todas sus clínicas. Cambiar de adaptador no toca base ni pantallas.
- **[CONFIRMAR con la DGII]** qué figura necesita un software multi-tenant para emitir por varias clínicas (proveedor de software o PSFE) y si cada clínica requiere su propio certificado digital.
- Fase 1 (adaptador 1): integrar un **proveedor autorizado por la DGII** vía API. DentalFlow envía el cobro y guarda la respuesta (e-NCF, estado, código de seguridad/QR, enlace).
- Libro interno (`billing_*`) intacto. Lo fiscal va en tablas aparte: `fiscal_invoices` (solo INSERT; anulación = otro registro tipo 34) y estado por consulta al proveedor.
- Credenciales del proveedor por clínica: nunca en tablas legibles; en Supabase Vault o secreto del servidor.

## Riesgo competitivo
SMILE (Alegra Dental) ya ofrece expediente dental + e-CF nativo. Sin e-CF antes del 15-nov, una clínica en RD no puede adoptar DentalFlow como sistema de cobro.

## Pendiente (Darys)
1. Elegir proveedor con **API documentada** y precio mipyme. Candidatos: Alegra/HolaBill (Alegra es dueña de SMILE: competidor), ProVenta, otros de la lista de proveedores autorizados de la DGII. [CONFIRMAR API, precio y sandbox]
2. Conseguir credenciales de prueba (sandbox) del proveedor elegido.

## Después (Claude base, Copilot pantalla)
Migración `fiscal_invoices` + RPC de emisión → server action que llama al proveedor → pantalla en Facturación (emitir 31/32, nota 34, estado, impresión con QR).
