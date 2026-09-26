import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { formatDominicanDocumentId } from "@/lib/phone";
import { formatDateLong, splitLocalDateTime } from "@/lib/timezone";
import { updateAppointment, updateAppointmentStatus } from "../../actions";
import { AppointmentForm } from "../../appointment-form";
import { StatusForm } from "../../status-form";
import { StatusChip } from "../../status-chip";

export const metadata: Metadata = { title: "Editar cita · DentalFlow" };

type AppointmentDetail = {
  id: string;
  patient_id: string;
  doctor_id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  patients: { id: string; full_name: string; document_id: string | null } | null;
  profiles: { full_name: string } | null;
};

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, doctor_id, starts_at, duration_minutes, reason, status, patients(id, full_name, document_id), profiles(full_name)"
    )
    .eq("id", id)
    .single<AppointmentDetail>();

  if (!appointment) notFound();

  const canManage = canManageAppointments(profile.role);
  const isOwnAppointment = appointment.doctor_id === profile.userId;
  if (!canManage && !isOwnAppointment) redirect("/appointments");

  const { dateKey, time } = splitLocalDateTime(appointment.starts_at);
  const updateAppointmentWithId = updateAppointment.bind(null, appointment.id);
  const updateStatusWithId = updateAppointmentStatus.bind(null, appointment.id);

  if (!canManage) {
    return (
      <div className="crystal-card mx-auto w-full max-w-lg rounded-3xl p-8">
        <h1 className="text-xl font-bold">Cita de {appointment.patients?.full_name ?? "paciente"}</h1>
        <p className="mt-1 text-sm text-slate-500">{formatDateLong(dateKey)}</p>

        <div className="mt-4 space-y-1.5 rounded-2xl border border-white/70 bg-white/50 p-4 text-sm">
          <p>
            <span className="font-semibold text-slate-700">Hora:</span> {time} · {appointment.duration_minutes} min
          </p>
          <p>
            <span className="font-semibold text-slate-700">Motivo:</span> {appointment.reason ?? "Sin motivo registrado"}
          </p>
          <p className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Estado actual:</span>
            <StatusChip status={appointment.status} />
          </p>
        </div>

        <div className="mt-6">
          <StatusForm action={updateStatusWithId} currentStatus={appointment.status} />
        </div>
      </div>
    );
  }

  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "doctor")
    .order("full_name", { ascending: true })
    .returns<{ id: string; full_name: string }[]>();

  return (
    <div className="crystal-card mx-auto w-full max-w-lg rounded-3xl p-8">
      <h1 className="text-xl font-bold">Editar cita</h1>
      <p className="mt-1 text-sm text-slate-500">
        {appointment.patients?.full_name}
        {appointment.patients?.document_id
          ? ` · ${formatDominicanDocumentId(appointment.patients.document_id)}`
          : ""}
      </p>
      <div className="mt-6">
        <AppointmentForm
          action={updateAppointmentWithId}
          doctors={doctors ?? []}
          defaultPatient={appointment.patients}
          defaultValues={{
            doctor_id: appointment.doctor_id,
            date: dateKey,
            time,
            duration_minutes: appointment.duration_minutes,
            reason: appointment.reason ?? "",
            status: appointment.status,
          }}
          showStatus
          submitLabel="Guardar cambios"
          pendingLabel="Guardando…"
        />
      </div>
    </div>
  );
}
