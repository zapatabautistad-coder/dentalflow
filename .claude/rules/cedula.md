---
paths:
  - "src/lib/cedula*"
  - "src/app/api/patients/lookup-cedula/**"
  - "src/app/**/patients/patient-form.tsx"
  - "src/app/**/patients/new/**"
---
# Cédula

Texto movido tal cual desde `CLAUDE.md` (sigue siendo regla del proyecto).

- Cédula: `src/lib/cedula.ts` valida el dígito verificador (módulo 10) con pruebas en `src/lib/cedula.test.ts` (`npm test`, Vitest). Al crear un paciente (no al editar), `/api/patients/lookup-cedula` primero busca la cédula en `patients` (si ya existe, no autocompleta: avisa y enlaza a la ficha para no duplicar) y solo si no está localmente intenta un proveedor externo configurado por `IDENTITY_API_URL`/`IDENTITY_API_KEY`. Sin esas variables no hay mock ni datos inventados: el mensaje pide llenar a mano. Los campos autocompletados siguen editables.
