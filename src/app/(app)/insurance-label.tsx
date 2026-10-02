import { arsName } from "@/lib/insurance";

// Aseguradora para mostrar en listas. El nombre de la ARS es un dato y no
// se traduce; "Privado" y "Sin aseguradora" son textos fijos (data-i18n).
export function InsuranceLabel({
  type,
  provider,
}: {
  type: "ars" | "privado" | null;
  provider: string | null;
}) {
  if (type === "ars") return <>{arsName(provider)}</>;
  if (type === "privado") return <span data-i18n="insurance.private">Privado</span>;
  return <span data-i18n="insurance.none">Sin aseguradora</span>;
}
