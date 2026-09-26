// Headers internos con los que el proxy pasa el usuario ya validado
// (via supabase.auth.getUser()) al resto del árbol de renderizado, para no
// repetir esa llamada de red en el layout/páginas.
// El proxy siempre los sobrescribe (los borra si no hay usuario), así que
// un cliente no puede falsificarlos.
export const USER_ID_HEADER = "x-df-user-id";
export const USER_EMAIL_HEADER = "x-df-user-email";
