export const TIME_ZONE = "America/Santo_Domingo";

// Santo Domingo no observa horario de verano: el offset es -04:00 todo el año.
const UTC_OFFSET = "-04:00";

export function todayDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDaysToDateKey(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Rango [start, end) en UTC para un día calendario en Santo Domingo.
export function dayBoundsUtc(dateKey: string): { start: string; end: string } {
  return {
    start: `${dateKey}T00:00:00${UTC_OFFSET}`,
    end: `${addDaysToDateKey(dateKey, 1)}T00:00:00${UTC_OFFSET}`,
  };
}

// Combina fecha (YYYY-MM-DD) y hora (HH:mm) locales en un timestamptz ISO.
export function combineDateTime(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00${UTC_OFFSET}`;
}

export function formatDateLong(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00${UTC_OFFSET}`);
  const formatted = new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00${UTC_OFFSET}`);
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatHour(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

// Separa un timestamptz ISO en fecha y hora locales para precargar un formulario.
export function splitLocalDateTime(iso: string): { dateKey: string; time: string } {
  const date = new Date(iso);
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { dateKey, time };
}
