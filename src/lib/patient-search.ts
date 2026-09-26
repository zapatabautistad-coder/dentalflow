// El texto de búsqueda entra en un filtro or() de PostgREST, donde
// `%`, `,`, `(` y `)` tienen significado especial: se descartan.
function sanitizeSearch(value: string) {
  return value.replace(/[%,()]/g, "").trim();
}

// document_id y phone se guardan sin guiones (solo dígitos), así que si el
// término de búsqueda trae dígitos también se busca por esa versión limpia.
export function buildPatientSearchFilter(rawQuery: string): string | null {
  const search = sanitizeSearch(rawQuery);
  if (!search) return null;

  const digits = search.replace(/\D/g, "");

  const parts = [
    `full_name.ilike.%${search}%`,
    `document_id.ilike.%${search}%`,
    `phone.ilike.%${search}%`,
  ];

  if (digits) {
    parts.push(`document_id.ilike.%${digits}%`, `phone.ilike.%${digits}%`);
  }

  return parts.join(",");
}
