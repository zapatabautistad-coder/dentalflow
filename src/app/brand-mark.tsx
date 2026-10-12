// Molar del logo (diente azul de cristal). Se sirve ya reducido para cada lugar y
// densidad de pantalla (public/dentalflow-mark-sky-*.png, generado con
// scripts/molar-tamanos.mjs): el navegador elige el que corresponde en vez de encoger
// el original 389×512 hasta 8 veces, que borra el borde plateado y los reflejos.
// Van en el primer nivel de public/: el proxy no deja pasar subcarpetas sin sesión.
const WIDTHS = [30, 37, 44, 49, 59, 61, 73, 88, 98, 122, 146, 152, 183, 244];
const SRC_SET = [
  ...WIDTHS.map((width) => `/dentalflow-mark-sky-${width}.png ${width}w`),
  "/dentalflow-mark-sky.png 389w",
].join(", ");

export function BrandMark({
  sizes,
  className,
}: {
  // Ancho en pantalla del molar (px CSS), p. ej. "48.6px".
  sizes: string;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image no admite un srcSet propio.
    <img
      src="/dentalflow-mark-sky-98.png"
      srcSet={SRC_SET}
      sizes={sizes}
      width={389}
      height={512}
      alt="DentalFlow"
      fetchPriority="high"
      className={className}
    />
  );
}
