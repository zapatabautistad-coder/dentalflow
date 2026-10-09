import Image from "next/image";

// Ícono de DentalFlow: orbe de vidrio azul cielo con el molar facetado sobre su
// pedestal de cristal. Llena el contenedor; "large" engrosa canto y sombras.
export function MolarOrb({ large = false, priority = false }: { large?: boolean; priority?: boolean }) {
  return (
    <span className={`molar-orb block h-full w-full ${large ? "molar-orb--lg" : ""}`}>
      <span aria-hidden="true" className="molar-base" />
      <span aria-hidden="true" className="molar-contact" />
      <Image
        src="/dentalflow-molar-diamond.png"
        alt="DentalFlow"
        width={587}
        height={810}
        sizes={large ? "180px" : "60px"}
        quality={95}
        priority={priority}
        className="molar-spin [filter:drop-shadow(0_4px_5px_rgba(7,55,90,0.3))]"
      />
    </span>
  );
}
