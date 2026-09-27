import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { isValidDateKey, todayDateKey } from "@/lib/timezone";
import { createAppointment } from "../actions";
import { AppointmentForm } from "../appointment-form";

export const metadata: Metadata = { title: "Nueva cita · DentalFlow" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const profile = await requireProfile();
  if (!canManageAppointments(profile.role)) redirect("/appointments");

  const supabase = await createClient();
  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "doctor")
    .order("full_name", { ascending: true })
    .returns<{ id: string; full_name: string }[]>();

  const dateKey = date && isValidDateKey(date) ? date : todayDateKey();

  return (
    <div className="crystal-card mx-auto w-full max-w-lg rounded-3xl p-5 sm:p-8">
      <h1 className="text-xl font-bold" data-i18n="appointments.form.title">Nueva cita</h1>
      <p className="mt-1 text-sm text-slate-500" data-i18n="appointments.form.subtitle">Programa una cita para un paciente.</p>
      <div className="mt-6">
        <AppointmentForm
          action={createAppointment}
          doctors={doctors ?? []}
          defaultValues={{ date: dateKey, duration_minutes: 30 }}
          submitLabel="Guardar cita"
          pendingLabel="Guardando…"
        />
      </div>
    </div>
  );
}
