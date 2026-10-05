import { isValidDateKey, splitLocalDateTime } from "./timezone";

export type ScheduleBlock = {
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

export type ScheduleTimeOff = {
  starts_on: string;
  ends_on: string;
  voided_at: string | null;
};

export type ScheduleAppointment = {
  starts_at: string;
  duration_minutes: number;
  status: string;
};

export type FreeTimeRange = {
  start_time: string;
  end_time: string;
};

type MinuteRange = { start: number; end: number };

function parseTime(value: string): number | null {
  const match = /^(\d{2}):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23) return null;

  return hour * 60 + minute;
}

function formatTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function mergeRanges(ranges: MinuteRange[]): MinuteRange[] {
  const sorted = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: MinuteRange[] = [];

  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
  }

  return merged;
}

export function getFreeTimeRanges(
  dateKey: string,
  blocks: ScheduleBlock[],
  timeOffEntries: ScheduleTimeOff[],
  appointments: ScheduleAppointment[]
): FreeTimeRange[] {
  if (!isValidDateKey(dateKey)) return [];
  if (
    timeOffEntries.some(
      (entry) => !entry.voided_at && entry.starts_on <= dateKey && entry.ends_on >= dateKey
    )
  ) {
    return [];
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const workRanges = mergeRanges(
    blocks
      .filter((block) => block.active && block.weekday === weekday)
      .flatMap((block) => {
        const start = parseTime(block.start_time);
        const end = parseTime(block.end_time);
        return start !== null && end !== null && end > start ? [{ start, end }] : [];
      })
  );

  if (workRanges.length === 0) return [];

  const occupiedRanges = mergeRanges(
    appointments
      .filter((appointment) => appointment.status !== "cancelada" && appointment.duration_minutes > 0)
      .flatMap((appointment) => {
        const local = splitLocalDateTime(appointment.starts_at);
        if (local.dateKey !== dateKey) return [];

        const start = parseTime(local.time);
        if (start === null) return [];

        const end = Math.min(start + appointment.duration_minutes, 24 * 60);
        return end > start ? [{ start, end }] : [];
      })
  );

  const freeRanges: MinuteRange[] = [];
  for (const workRange of workRanges) {
    let cursor = workRange.start;

    for (const occupiedRange of occupiedRanges) {
      if (occupiedRange.end <= cursor) continue;
      if (occupiedRange.start >= workRange.end) break;

      const gapEnd = Math.min(occupiedRange.start, workRange.end);
      if (gapEnd > cursor) freeRanges.push({ start: cursor, end: gapEnd });
      cursor = Math.max(cursor, Math.min(occupiedRange.end, workRange.end));
      if (cursor >= workRange.end) break;
    }

    if (cursor < workRange.end) freeRanges.push({ start: cursor, end: workRange.end });
  }

  return freeRanges.map((range) => ({
    start_time: formatTime(range.start),
    end_time: formatTime(range.end),
  }));
}