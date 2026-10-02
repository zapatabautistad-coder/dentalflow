// Nombre de la ARS para mostrar. Muchas se registran ya con "ARS" en el
// nombre ("ARS Humano"); en ese caso no se repite el prefijo.
export function arsName(provider: string | null | undefined): string {
  const name = provider?.trim() ?? "";
  if (!name) return "ARS —";
  return /^ars\b/i.test(name) ? name : `ARS ${name}`;
}
