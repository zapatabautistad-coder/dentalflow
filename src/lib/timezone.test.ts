import { describe, expect, it } from "vitest";
import { subtractMonthsFromDateKey, subtractMonthsLocal } from "./timezone";

describe("subtractMonthsFromDateKey", () => {
  it("resta meses dentro del mismo año", () => {
    expect(subtractMonthsFromDateKey("2026-09-15", 6)).toBe("2026-03-15");
  });

  it("cruza el cambio de año", () => {
    expect(subtractMonthsFromDateKey("2026-03-10", 6)).toBe("2025-09-10");
    expect(subtractMonthsFromDateKey("2026-01-31", 12)).toBe("2025-01-31");
  });

  it("usa el último día del mes cuando el día no existe (fin de mes)", () => {
    expect(subtractMonthsFromDateKey("2026-08-31", 6)).toBe("2026-02-28");
    expect(subtractMonthsFromDateKey("2024-08-31", 6)).toBe("2024-02-29");
    expect(subtractMonthsFromDateKey("2026-12-31", 6)).toBe("2026-06-30");
  });

  it("maneja el 29 de febrero al restar 12 meses", () => {
    expect(subtractMonthsFromDateKey("2024-02-29", 12)).toBe("2023-02-28");
  });
});

describe("subtractMonthsLocal", () => {
  it("conserva la hora local de Santo Domingo", () => {
    const now = new Date("2026-09-29T14:35:12.345-04:00");
    expect(subtractMonthsLocal(now, 6).toISOString()).toBe("2026-03-29T18:35:12.345Z");
  });

  it("usa la fecha local, no la UTC, cerca de medianoche", () => {
    // 22:30 del 31-ago en Santo Domingo ya es 1-sep en UTC.
    const now = new Date("2026-08-31T22:30:00-04:00");
    expect(subtractMonthsLocal(now, 6).toISOString()).toBe("2026-03-01T02:30:00.000Z");
  });

  it("ajusta el fin de mes al restar 12 meses", () => {
    const now = new Date("2024-02-29T09:00:00-04:00");
    expect(subtractMonthsLocal(now, 12).toISOString()).toBe("2023-02-28T13:00:00.000Z");
  });
});
