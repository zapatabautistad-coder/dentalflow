// Roles y sus nombres visibles. Archivo aparte (sin código de servidor) para
// poder usarlo también en componentes del navegador.
export type Role = "doctor" | "recepcion" | "enfermeria" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  doctor: "Doctor",
  recepcion: "Recepción",
  enfermeria: "Enfermería",
  admin: "Admin",
};
