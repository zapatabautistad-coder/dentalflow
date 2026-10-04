import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, imágenes y metadatos. Las imágenes se
    // excluyen solo en el primer nivel (los archivos de public/): una ruta como
    // /patients/x.png debe pasar por el proxy, que borra la cabecera interna
    // del usuario; si no, alguien podría enviarla falsificada.
    "/((?!_next/static|_next/image|favicon\\.ico$|sitemap\\.xml$|robots\\.txt$|[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
