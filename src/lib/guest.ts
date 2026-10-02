import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Cuentas temporales (visitas, migración 022): cualquier rol, con fecha de
// vencimiento (guest_expires_at). Al salir se desactivan; si la persona
// vuelve a intentar entrar se guarda una solicitud que el admin ve en
// notificaciones y en Cuentas.

import { DEFAULT_GUEST_HOURS, GUEST_HOURS } from "@/lib/guest-hours";

const BAN_FOREVER = "876000h";

export function guestExpiry(hours: number, from = new Date()): string {
  const safe = (GUEST_HOURS as readonly number[]).includes(hours) ? hours : DEFAULT_GUEST_HOURS;
  return new Date(from.getTime() + safe * 3600_000).toISOString();
}

export const GUEST_ENDED_MESSAGE =
  "Tu acceso de visita terminó. Ya le avisamos al administrador para que te dé acceso otra vez.";

type GuestProfile = { id: string; active: boolean; guest_expires_at: string | null };

async function profileOf(userId: string): Promise<GuestProfile | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("id, active, guest_expires_at")
    .eq("id", userId)
    .maybeSingle<GuestProfile>();
  return data ?? null;
}

export function isGuestAccessOver(profile: GuestProfile): boolean {
  return !profile.active || (profile.guest_expires_at !== null && new Date(profile.guest_expires_at).getTime() <= Date.now());
}

// Desactiva la cuenta temporal y bloquea su inicio de sesión. Idempotente.
// Las cuentas del personal (sin vencimiento) no se tocan.
export async function endGuestVisit(userId: string, reason: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const profile = await profileOf(userId);
  if (!profile || !profile.guest_expires_at) return;
  if (profile.active) {
    await admin.from("profiles").update({ active: false, deactivated_reason: reason }).eq("id", userId);
  }
  await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
}

// Guarda una solicitud de acceso (una abierta por cuenta como máximo).
export async function recordGuestAccessRequest(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const profile = await profileOf(userId);
  if (!profile || !profile.guest_expires_at) return;
  const { data: open } = await admin
    .from("access_requests")
    .select("id")
    .eq("profile_id", userId)
    .is("resolved_at", null)
    .limit(1);
  if (open && open.length > 0) return;
  await admin.from("access_requests").insert({ profile_id: userId });
}

// Para el login: si es una cuenta temporal con el acceso terminado,
// lo cierra, avisa al admin y devuelve true.
export async function guestBlockedOnLogin(userId: string): Promise<boolean> {
  const profile = await profileOf(userId);
  if (!profile || !profile.guest_expires_at || !isGuestAccessOver(profile)) return false;
  await endGuestVisit(userId, "Visita terminada: venció el tiempo de acceso");
  await recordGuestAccessRequest(userId);
  return true;
}

// Para el login cuando Supabase rechaza a un usuario bloqueado: busca su
// cuenta por correo y, si es temporal, deja la solicitud para el admin.
export async function recordGuestRequestByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (!user) return false;
  const profile = await profileOf(user.id);
  if (!profile || !profile.guest_expires_at) return false;
  await recordGuestAccessRequest(user.id);
  return true;
}
