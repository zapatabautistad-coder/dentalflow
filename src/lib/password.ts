// Misma regla que Supabase Auth (Authentication → Policies): mínimo 10
// caracteres con minúsculas, mayúsculas, números y símbolos.
export const PASSWORD_RULE_TEXT =
  "Mínimo 10 caracteres, con minúsculas, mayúsculas, números y símbolos.";

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
