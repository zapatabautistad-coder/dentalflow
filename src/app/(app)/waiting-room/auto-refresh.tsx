"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_EVERY_MS = 30_000;

// Vuelve a pedir los datos de la sala de espera cada 30 s (solo con la
// pestaña visible) para que las llegadas y los minutos de espera no se
// queden congelados. No cuenta como actividad del usuario para el cierre
// de sesión por inactividad.
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = setInterval(refresh, REFRESH_EVERY_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
