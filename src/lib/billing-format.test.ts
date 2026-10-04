import { describe, expect, it } from "vitest";
import { formatBillingDate } from "./billing-format";

describe("formatBillingDate", () => {
  it("formatea una fecha normal en hora de Santo Domingo", () => {
    expect(formatBillingDate("2026-10-02T19:05:00.000Z")).toBe("2026-10-02 15:05");
  });

  it("usa el día local cuando UTC ya cambió al día siguiente", () => {
    expect(formatBillingDate("2026-10-02T03:59:00.000Z")).toBe("2026-10-01 23:59");
  });

  it("representa medianoche con hora 00", () => {
    expect(formatBillingDate("2026-10-02T04:00:00.000Z")).toBe("2026-10-02 00:00");
  });

  it("devuelve un marcador seguro para fechas inválidas", () => {
    expect(formatBillingDate("fecha-inválida")).toBe("—");
  });
});