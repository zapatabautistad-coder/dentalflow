import type { Metadata } from "next";
import { AutoRefresh } from "./auto-refresh";
import { createClient } from "@/lib/supabase/server";
import { canManageAppointments, requireProfile } from "@/lib/auth";
import { formatDateLong, todayDateKey } from "@/lib/timezone";
import { callNextPatient, setQueueStatus } from "./actions";

export const metadata: Metadata = { title: "Sala de espera · DentalFlow" };

type QueueStatus = "en_espera" | "llamado" | "en_atencion" | "atendido" | "cancelado";

type WaitingRoomRow = {
  id: string;
  position: number;
  status: QueueStatus;
  doctor_id: string | null;
  checked_in_at: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

const STATUS_LABELS: Record<QueueStatus, { label: string; key: string }> = {
  en_espera: { label: "En espera", key: "waitingRoom.status.waiting" },
  llamado: { label: "Llamado", key: "waitingRoom.status.called" },
  en_atencion: { label: "En atención", key: "waitingRoom.status.inCare" },
  atendido: { label: "Atendido", key: "waitingRoom.status.attended" },
  cancelado: { label: "Cancelado", key: "waitingRoom.status.cancelled" },
};

function waitingMinutes(checkedInAt: string, now: number) {
  const checkedInTime = new Date(checkedInAt).getTime();
  if (Number.isNaN(checkedInTime)) return 0;
  return Math.max(0, Math.floor((now - checkedInTime) / 60000));
}

function StatusActions({ entry }: { entry: WaitingRoomRow }) {
  const actions =
    entry.status === "en_espera"
      ? [{ status: "llamado", label: "Llamar", key: "waitingRoom.action.call", style: "glass-button" }]
      : entry.status === "llamado"
        ? [{ status: "en_atencion", label: "En atención", key: "waitingRoom.action.inCare", style: "glass-button" }]
        : entry.status === "en_atencion"
          ? [{ status: "atendido", label: "Atendido", key: "waitingRoom.action.attended", style: "glass-button" }]
          : [];

  if (entry.status !== "atendido" && entry.status !== "cancelado") {
    actions.push({ status: "cancelado", label: "Cancelar", key: "waitingRoom.action.cancel", style: "glass-button-light" });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {actions.map((action) => (
        <form key={action.status} action={setQueueStatus.bind(null, entry.id, action.status)}>
          <button type="submit" className={`${action.style} min-h-11 w-full px-4 text-sm font-semibold sm:w-auto`} data-i18n={action.key}>
            {action.label}
          </button>
        </form>
      ))}
    </div>
  );
}

export default async function WaitingRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error: errorCode }, profile] = await Promise.all([searchParams, requireProfile()]);
  const canManage = canManageAppointments(profile.role);
  const dateKey = todayDateKey();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("queue")
    .select("id, position, status, doctor_id, checked_in_at, patients(full_name), profiles(full_name)")
    .eq("queue_date", dateKey)
    .order("position", { ascending: true })
    .returns<WaitingRoomRow[]>();

  const entries = data ?? [];
  const now = new Date().getTime();
  const isDoctor = profile.role === "doctor";
  const myWaiting = isDoctor
    ? entries.filter((entry) => entry.doctor_id === profile.userId && entry.status === "en_espera").length
    : 0;
  const errorMessageKey =
    errorCode === "permission"
      ? "waitingRoom.error.permission"
      : errorCode === "empty"
        ? "waitingRoom.error.empty"
        : errorCode
          ? "waitingRoom.error.save"
          : null;
  const errorText =
    errorCode === "permission"
      ? "No tienes permiso para realizar esta acción."
      : errorCode === "empty"
        ? "No tienes pacientes esperando."
        : "No se pudo guardar el cambio. Recarga la página e inténtalo de nuevo.";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <AutoRefresh />
      <header>
        <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="waitingRoom.title">Sala de espera</h1>
        <p className="mt-1 text-[13px] font-bold uppercase text-slate-500" data-i18n-date={dateKey}>{formatDateLong(dateKey)}</p>
      </header>

      {isDoctor && (
        <form action={callNextPatient} className="crystal-card flex flex-col gap-3 rounded-[20px] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] font-semibold text-[#0766B5]">
            {myWaiting === 0 ? "No tienes pacientes esperando." : `Tienes ${myWaiting} paciente${myWaiting === 1 ? "" : "s"} esperando.`}
          </p>
          <button type="submit" disabled={myWaiting === 0} className="glass-button min-h-11 px-5 text-[15px] font-semibold disabled:opacity-50" data-i18n="waitingRoom.action.callNext">
            Llamar siguiente
          </button>
        </form>
      )}

      {errorMessageKey && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n={errorMessageKey}>
          {errorText}
        </p>
      )}

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="waitingRoom.error.load">
          No se pudo cargar la sala de espera. Recarga la página.
        </p>
      ) : entries.length === 0 ? (
        <section className="crystal-card rounded-[20px] p-6 text-center text-sm text-slate-500" data-i18n="waitingRoom.empty">
          No hay pacientes en sala de espera.
        </section>
      ) : (
        <ul className="grid min-w-0 grid-cols-1 gap-3">
          {entries.map((entry) => {
            const status = STATUS_LABELS[entry.status];
            const minutes = waitingMinutes(entry.checked_in_at, now);

            return (
              <li key={entry.id} className="crystal-card min-w-0 rounded-[20px] p-4 sm:p-5">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/60 text-sm font-black text-[#0766B5]">
                      {entry.position}
                    </span>
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-black text-[#0F172A]">{entry.patients?.full_name ?? "Paciente"}</h2>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        <span data-i18n="waitingRoom.doctor">Doctor</span>: {entry.profiles?.full_name ?? "—"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        <span>{minutes}</span> <span data-i18n="waitingRoom.waitingMinutes">minutos esperando</span>
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-white/80 bg-white/60 px-3 py-1 text-xs font-bold text-[#0766B5]" data-i18n={status.key}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {(canManage || (isDoctor && entry.doctor_id === profile.userId)) && <StatusActions entry={entry} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}