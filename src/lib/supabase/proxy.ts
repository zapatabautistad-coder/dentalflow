import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "@/lib/auth-headers";
import { getMfaDecision } from "@/lib/mfa";

// Verificación en dos pasos (ver src/lib/mfa.ts).
const VERIFY_PATH = "/login/verificar";
const SECURITY_PATH = "/seguridad";

// Refresca la sesión de Supabase (cookies) y aplica la protección de rutas.
export async function updateSession(request: NextRequest) {
  // Nunca reenviar estos headers tal cual llegaron del cliente: se
  // sobrescriben siempre más abajo con el resultado de getUser().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // No escribir código entre createServerClient y getUser():
  // getUser() valida el token con Supabase y lo refresca si caducó.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname !== "/login") {
    return redirectKeepingCookies(request, response, "/login");
  }

  if (user && pathname === "/login") {
    return redirectKeepingCookies(request, response, "/panel");
  }

  // Usuario ya validado: lo exponemos al layout/páginas vía header interno
  // para que no tengan que llamar a getUser() otra vez.
  if (user) {
    requestHeaders.set(USER_ID_HEADER, user.id);
    if (user.email) requestHeaders.set(USER_EMAIL_HEADER, user.email);
  }

  // /login/verificar siempre pasa (ahí se completa el segundo paso). /seguridad solo
  // pasa para quien debe ACTIVAR la app: con un factor ya activo y sesión aal1 (solo
  // contraseña) no se muestra nada de la app, ni siquiera la barra lateral, que carga
  // notificaciones con nombres de pacientes.
  if (user && pathname !== VERIFY_PATH) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      if (pathname === SECURITY_PATH) return finish(response, requestHeaders);
      return redirectKeepingCookies(request, response, `${SECURITY_PATH}?error=check`);
    }

    // Los factores vienen en el usuario que ya validó getUser(): listFactors() volvería
    // a llamar a getUser() (otra ida a Supabase en cada petición). El nivel aal sale de
    // la sesión, sin red.
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError) {
      if (pathname === SECURITY_PATH) return finish(response, requestHeaders);
      return redirectKeepingCookies(request, response, `${SECURITY_PATH}?error=check`);
    }

    const hasVerifiedTotp = (user.factors ?? []).some(
      (factor) => factor.factor_type === "totp" && factor.status === "verified"
    );
    const decision = getMfaDecision(profile.role, hasVerifiedTotp, assurance.currentLevel);

    if (decision === "verificar") {
      return redirectKeepingCookies(request, response, VERIFY_PATH);
    }

    if (decision === "activar" && pathname !== SECURITY_PATH) {
      return redirectKeepingCookies(request, response, `${SECURITY_PATH}?mfa=required`);
    }
  }

  return finish(response, requestHeaders);
}

function finish(response: NextResponse, requestHeaders: Headers) {
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));
  return finalResponse;
}

// Redirige conservando las cookies de sesión que Supabase haya actualizado.
function redirectKeepingCookies(
  request: NextRequest,
  response: NextResponse,
  destination: string
) {
  const url = new URL(destination, request.url);
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
