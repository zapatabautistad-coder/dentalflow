import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateLong, isValidDateKey, todayDateKey, dayBoundsUtc } from "@/lib/timezone";
import { getFreeTimeRanges, type ScheduleAppointment, type ScheduleBlock, type ScheduleTimeOff } from "@/lib/schedule";
import { addScheduleBlock, addTimeOff, deactivateScheduleBlock, voidTimeOff } from "./actions";

export const metadata: Metadata = { title: "Horarios · DentalFlow" };

type SearchValue = string | string[] | undefined;
type DoctorOption = { id: string; full_name: string };
type ScheduleRow = ScheduleBlock & { id: string };
type TimeOffRow = ScheduleTimeOff & { id: string; reason: string; void_reason: string | null };

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const ACTION_ERROR_MESSAGES: Record<string, string> = {
  "schedule.error.doctorRequired": "Selecciona un doctor.",
  "schedule.error.doctorInvalid": "Selecciona un doctor activo.",
  "schedule.error.blockInvalid": "Revisa el día y el rango de horas.",
  "schedule.error.blockNotFound": "El bloque ya no está activo o no existe.",
  "schedule.error.timeOffInvalid": "Revisa las fechas y el motivo del día libre.",
  "schedule.error.voidReasonRequired": "Escribe el motivo de la anulación.",
  "schedule.error.timeOffNotFound": "El día libre ya está anulado o no existe.",
  "schedule.error.overlap": "Ese bloque se cruza con otro horario del mismo día.",
  "schedule.error.reasonLength": "El motivo del día libre debe tener entre 3 y 200 caracteres.",
  "schedule.error.voidReasonLength": "El motivo de la anulación debe tener entre 5 y 500 caracteres.",
  "schedule.error.saveFailed": "No se pudo guardar. Inténtalo de nuevo.",
};

function firstValue(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function displayTime(value: string): string {
  return value.slice(0, 5);
}

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ doctor?: SearchValue; day?: SearchValue; errorKey?: SearchValue }>;
}) {
  const profile = await requireProfile();
  const isDoctor = profile.role === "doctor";
  const canChooseDoctor = profile.role === "admin" || profile.role === "recepcion";
  if (!isDoctor && !canChooseDoctor) redirect("/panel");

  const params = await searchParams;
  const requestedDay = firstValue(params.day);
  const dayKey = requestedDay && isValidDateKey(requestedDay) ? requestedDay : todayDateKey();
  const requestedDoctor = firstValue(params.doctor);
  const supabase = await createClient();

  let doctors: DoctorOption[] = [];
  let doctorLoadError: string | null = null;
  if (canChooseDoctor) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "doctor")
      .eq("active", true)
      .order("full_name", { ascending: true })
      .returns<DoctorOption[]>();
    doctors = data ?? [];
    doctorLoadError = error?.message ?? null;
  }

  const selectedDoctor = isDoctor
    ? { id: profile.userId, full_name: profile.fullName }
    : doctors.find((doctor) => doctor.id === requestedDoctor) ?? doctors[0] ?? null;
  const selectedDoctorId = selectedDoctor?.id ?? null;
  const dayBounds = dayBoundsUtc(dayKey);

  let scheduleBlocks: ScheduleRow[] = [];
  let timeOffEntries: TimeOffRow[] = [];
  let appointments: ScheduleAppointment[] = [];
  let scheduleLoadError: string | null = null;
  let timeOffLoadError: string | null = null;
  let appointmentsLoadError: string | null = null;
  const databaseErrors: string[] = [];
  if (doctorLoadError) databaseErrors.push(doctorLoadError);

  if (selectedDoctorId) {
    const [scheduleResult, timeOffResult, appointmentsResult] = await Promise.all([
      supabase
        .from("doctor_schedules")
        .select("id, weekday, start_time, end_time, active")
        .eq("doctor_id", selectedDoctorId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true })
        .returns<ScheduleRow[]>(),
      supabase
        .from("doctor_time_off")
        .select("id, starts_on, ends_on, reason, voided_at, void_reason")
        .eq("doctor_id", selectedDoctorId)
        .order("starts_on", { ascending: false })
        .returns<TimeOffRow[]>(),
      supabase
        .from("appointments")
        .select("starts_at, duration_minutes, status")
        .eq("doctor_id", selectedDoctorId)
        .neq("status", "cancelada")
        .gte("starts_at", dayBounds.start)
        .lt("starts_at", dayBounds.end)
        .order("starts_at", { ascending: true })
        .returns<ScheduleAppointment[]>(),
    ]);

    scheduleBlocks = scheduleResult.data ?? [];
    timeOffEntries = timeOffResult.data ?? [];
    appointments = appointmentsResult.data ?? [];
    scheduleLoadError = scheduleResult.error?.message ?? null;
    timeOffLoadError = timeOffResult.error?.message ?? null;
    appointmentsLoadError = appointmentsResult.error?.message ?? null;
    databaseErrors.push(
      ...[scheduleResult.error, timeOffResult.error, appointmentsResult.error]
        .map((error) => error?.message)
        .filter((message): message is string => Boolean(message))
    );
  }

  const availabilityKnown = Boolean(
    selectedDoctorId && !scheduleLoadError && !timeOffLoadError && !appointmentsLoadError
  );
  const freeRanges = availabilityKnown
    ? getFreeTimeRanges(dayKey, scheduleBlocks, timeOffEntries, appointments)
    : [];
  // Solo claves conocidas: un texto libre en la URL nunca se muestra.
  const actionErrorKey = firstValue(params.errorKey);
  const translatedActionError = actionErrorKey ? ACTION_ERROR_MESSAGES[actionErrorKey] : undefined;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="schedule.title">Horarios</h1>
          <p className="mt-1 text-sm text-slate-600" data-i18n="schedule.subtitle">
            Bloques semanales, días libres y disponibilidad del doctor.
          </p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          {canChooseDoctor ? (
            <label htmlFor="schedule-doctor" className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              <span data-i18n="schedule.doctor">Doctor</span>
              <select
                id="schedule-doctor"
                name="doctor"
                required
                defaultValue={selectedDoctorId ?? ""}
                className="glass-input min-h-11 min-w-48 px-3 text-sm"
              >
                <option value="" disabled data-i18n="schedule.selectDoctor">Selecciona un doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              <span data-i18n="schedule.doctor">Doctor</span>
              <span className="flex min-h-11 items-center px-2 text-sm text-slate-800">{profile.fullName}</span>
            </div>
          )}
          <label htmlFor="schedule-day" className="flex flex-col gap-1 text-xs font-bold text-slate-600">
            <span data-i18n="schedule.day">Día</span>
            <input id="schedule-day" name="day" type="date" required defaultValue={dayKey} className="glass-input min-h-11 px-3 text-sm" />
          </label>
          <button type="submit" className="glass-button min-h-11 px-4 text-sm font-semibold" data-i18n="schedule.showDay">
            Ver día
          </button>
        </form>
      </header>

      {translatedActionError && (
        <p role="alert" data-i18n={actionErrorKey} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {translatedActionError}
        </p>
      )}
      {databaseErrors.map((error, index) => (
        <p key={`${index}-${error}`} role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ))}

      {canChooseDoctor && doctors.length === 0 && !doctorLoadError ? (
        <p className="crystal-card rounded-[18px] p-4 text-sm text-slate-600" data-i18n="schedule.noDoctors">
          No hay doctores activos.
        </p>
      ) : selectedDoctorId ? (
        <>
          <section className="crystal-card rounded-[20px] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-black text-slate-800" data-i18n="schedule.availability">Huecos libres</h2>
              <p className="text-sm capitalize text-slate-600" data-i18n-date={dayKey}>{formatDateLong(dayKey)}</p>
            </div>
            {availabilityKnown && freeRanges.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500" data-i18n="schedule.noFreeTime">
                No hay huecos libres para este día.
              </p>
            ) : availabilityKnown ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {freeRanges.map((range) => (
                  <li key={`${range.start_time}-${range.end_time}`} className="rounded-lg border border-[#0E9BF3]/20 bg-white/65 px-3 py-2 text-sm font-semibold tabular-nums text-[#0766B5]">
                    {range.start_time}–{range.end_time}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="crystal-card min-w-0 rounded-[20px] p-4">
              <h2 className="text-sm font-black text-slate-800" data-i18n="schedule.blocks">Bloques semanales</h2>
              <form action={addScheduleBlock} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="doctor_id" value={selectedDoctorId} />
                <input type="hidden" name="day" value={dayKey} />
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  <span data-i18n="schedule.weekday">Día de la semana</span>
                  <select name="weekday" required defaultValue="1" className="glass-input min-h-11 px-3 text-sm">
                    {WEEKDAYS.map((weekday, index) => (
                      <option key={weekday} value={index} data-i18n={`schedule.weekday.${index}`}>{weekday}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                    <span data-i18n="schedule.start">Desde</span>
                    <input type="time" name="start_time" required className="glass-input min-h-11 min-w-0 px-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                    <span data-i18n="schedule.end">Hasta</span>
                    <input type="time" name="end_time" required className="glass-input min-h-11 min-w-0 px-2 text-sm" />
                  </label>
                </div>
                <button type="submit" className="glass-button min-h-11 px-4 text-sm font-semibold sm:col-span-2" data-i18n="schedule.addBlock">
                  Agregar bloque
                </button>
              </form>

              {scheduleBlocks.length === 0 && !scheduleLoadError ? (
                <p className="mt-4 text-sm text-slate-500" data-i18n="schedule.noBlocks">
                  No hay bloques registrados.
                </p>
              ) : scheduleBlocks.length > 0 ? (
                <ul className="mt-4 divide-y divide-white/70">
                  {scheduleBlocks.map((block) => (
                    <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          <span data-i18n={`schedule.weekday.${block.weekday}`}>{WEEKDAYS[block.weekday]}</span>
                          {" · "}{displayTime(block.start_time)}–{displayTime(block.end_time)}
                        </p>
                        {!block.active && <p className="text-xs text-slate-500" data-i18n="schedule.inactive">Inactivo</p>}
                      </div>
                      {block.active && (
                        <form action={deactivateScheduleBlock}>
                          <input type="hidden" name="doctor_id" value={selectedDoctorId} />
                          <input type="hidden" name="day" value={dayKey} />
                          <input type="hidden" name="schedule_id" value={block.id} />
                          <button type="submit" className="min-h-10 rounded-lg border border-slate-200 bg-white/60 px-3 text-sm font-semibold text-slate-700 transition hover:bg-white" data-i18n="schedule.deactivate">
                            Desactivar
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="crystal-card min-w-0 rounded-[20px] p-4">
              <h2 className="text-sm font-black text-slate-800" data-i18n="schedule.timeOff">Días libres</h2>
              <form action={addTimeOff} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="doctor_id" value={selectedDoctorId} />
                <input type="hidden" name="day" value={dayKey} />
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  <span data-i18n="schedule.startsOn">Desde</span>
                  <input type="date" name="starts_on" required className="glass-input min-h-11 min-w-0 px-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  <span data-i18n="schedule.endsOn">Hasta</span>
                  <input type="date" name="ends_on" required className="glass-input min-h-11 min-w-0 px-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 sm:col-span-2">
                  <span data-i18n="schedule.reason">Motivo</span>
                  <textarea name="reason" required minLength={3} maxLength={200} rows={2} className="glass-input resize-y px-3 py-2 text-sm" />
                </label>
                <button type="submit" className="glass-button min-h-11 px-4 text-sm font-semibold sm:col-span-2" data-i18n="schedule.addTimeOff">
                  Agregar día libre
                </button>
              </form>

              {timeOffEntries.length === 0 && !timeOffLoadError ? (
                <p className="mt-4 text-sm text-slate-500" data-i18n="schedule.noTimeOff">
                  No hay días libres registrados.
                </p>
              ) : timeOffEntries.length > 0 ? (
                <ul className="mt-4 divide-y divide-white/70">
                  {timeOffEntries.map((entry) => (
                    <li key={entry.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            <span data-i18n-date={entry.starts_on}>{formatDateLong(entry.starts_on)}</span>
                            {entry.ends_on !== entry.starts_on && (
                              <> – <span data-i18n-date={entry.ends_on}>{formatDateLong(entry.ends_on)}</span></>
                            )}
                          </p>
                          <p className="mt-1 break-words text-sm text-slate-600">{entry.reason}</p>
                          {entry.voided_at && (
                            <p className="mt-1 break-words text-xs text-slate-500">
                              <span data-i18n="schedule.voided">Anulado:</span> {entry.void_reason}
                            </p>
                          )}
                        </div>
                        {!entry.voided_at && (
                          <form action={voidTimeOff} className="flex min-w-48 flex-1 items-end gap-2 sm:max-w-sm">
                            <input type="hidden" name="doctor_id" value={selectedDoctorId} />
                            <input type="hidden" name="day" value={dayKey} />
                            <input type="hidden" name="time_off_id" value={entry.id} />
                            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
                              <span data-i18n="schedule.voidReason">Motivo de anulación</span>
                              <input type="text" name="void_reason" required minLength={5} maxLength={500} className="glass-input min-h-10 min-w-0 px-2 text-sm" />
                            </label>
                            <button type="submit" className="min-h-10 shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100" data-i18n="schedule.void">
                              Anular
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}