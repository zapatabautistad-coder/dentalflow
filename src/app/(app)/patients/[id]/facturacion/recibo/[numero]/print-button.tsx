"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="glass-button min-h-11 px-4 text-sm font-semibold"
      data-i18n="billing.receipt.print"
    >
      Imprimir
    </button>
  );
}
