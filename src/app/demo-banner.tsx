// Franja visible solo en la app de demostración (NEXT_PUBLIC_DEMO_MODE=1 en
// su proyecto de Vercel). Deja claro que los datos son ficticios.
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return null;
  return (
    <div
      role="note"
      className="pointer-events-none fixed bottom-2 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-amber-300 bg-amber-100/95 px-3 py-1 text-center text-[11px] font-semibold text-amber-900 shadow"
    >
      <span data-i18n="demo.banner">Versión de demostración · todos los datos son ficticios</span>
    </div>
  );
}
