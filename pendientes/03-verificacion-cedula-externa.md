# Autocompletar cédula con proveedor externo de identidad

**Qué hace:** ya está construido el 90% (ver `CLAUDE.md` → sección Cédula): validación del dígito verificador, búsqueda de duplicados en la base local, y la ruta `/api/patients/lookup-cedula` lista para llamar a un proveedor externo.

**Bloqueado por (lo pone el dueño del proyecto):**
- Conseguir un proveedor de identidad dominicano real (API paga o con contrato — la JCE no tiene API pública gratuita).
- Agregar `IDENTITY_API_URL` e `IDENTITY_API_KEY` en Vercel y `.env.local`.

**Mientras tanto:** sin esas variables, el sistema no inventa datos — solo avisa "completa los datos manualmente" (regla del proyecto: nunca mostrar información inventada).

**Estado:** infraestructura lista, falta el proveedor externo.
