import { describe, expect, it } from "vitest";
import { getFreeTimeRanges, type ScheduleBlock } from "./schedule";

const mondayBlock: ScheduleBlock = {
  weekday: 1,
  start_time: "08:00:00",
  end_time: "12:00:00",
  active: true,
};

describe("getFreeTimeRanges", () => {
  it("subtracts appointments using Santo Domingo local time", () => {
    const ranges = getFreeTimeRanges(
      "2026-01-05",
      [mondayBlock],
      [],
      [{ starts_at: "2026-01-05T13:00:00.000Z", duration_minutes: 30, status: "programada" }]
    );

    expect(ranges).toEqual([
      { start_time: "08:00", end_time: "09:00" },
      { start_time: "09:30", end_time: "12:00" },
    ]);
  });

  it("ignores cancelled appointments and inactive blocks", () => {
    const ranges = getFreeTimeRanges(
      "2026-01-05",
      [mondayBlock, { ...mondayBlock, active: false, start_time: "13:00:00", end_time: "14:00:00" }],
      [],
      [{ starts_at: "2026-01-05T14:00:00.000Z", duration_minutes: 30, status: "cancelada" }]
    );

    expect(ranges).toEqual([{ start_time: "08:00", end_time: "12:00" }]);
  });

  it("returns no availability during an inclusive, non-voided time off", () => {
    const ranges = getFreeTimeRanges(
      "2026-01-05",
      [mondayBlock],
      [{ starts_on: "2026-01-04", ends_on: "2026-01-05", voided_at: null }],
      []
    );

    expect(ranges).toEqual([]);
  });

  it("does not apply a voided time off and merges overlapping blocks and appointments", () => {
    const ranges = getFreeTimeRanges(
      "2026-01-05",
      [mondayBlock, { ...mondayBlock, start_time: "11:00:00", end_time: "13:00:00" }],
      [{ starts_on: "2026-01-05", ends_on: "2026-01-05", voided_at: "2026-01-01T12:00:00Z" }],
      [
        { starts_at: "2026-01-05T13:00:00.000Z", duration_minutes: 60, status: "confirmada" },
        { starts_at: "2026-01-05T13:30:00.000Z", duration_minutes: 60, status: "en_curso" },
      ]
    );

    expect(ranges).toEqual([
      { start_time: "08:00", end_time: "09:00" },
      { start_time: "10:30", end_time: "13:00" },
    ]);
  });

  it("returns no ranges for an invalid date", () => {
    expect(getFreeTimeRanges("2026-02-30", [mondayBlock], [], [])).toEqual([]);
  });
});