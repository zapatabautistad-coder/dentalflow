import { describe, expect, it } from "vitest";
import { patientBalance } from "./billing";

describe("patientBalance", () => {
  it("resta los pagos de lo que corresponde al paciente", () => {
    const result = patientBalance(
      [
        { amount: 3500, ars_coverage: 2000, patient_amount: 1500, ars_status: "pendiente", voided_at: null },
        { amount: "2500.50", ars_coverage: 0, patient_amount: "2500.50", ars_status: "no_aplica", voided_at: null },
      ],
      [{ amount: 1000, voided_at: null }]
    );
    expect(result).toEqual({ patientCharged: 4000.5, paid: 1000, balance: 3000.5, arsPending: 2000 });
  });

  it("no cuenta lo anulado", () => {
    const result = patientBalance(
      [{ amount: 2000, ars_coverage: 0, patient_amount: 2000, ars_status: "no_aplica", voided_at: "2026-10-01T10:00:00Z" }],
      [{ amount: 500, voided_at: "2026-10-01T10:00:00Z" }]
    );
    expect(result).toEqual({ patientCharged: 0, paid: 0, balance: 0, arsPending: 0 });
  });

  it("si la ARS rechaza, la cobertura pasa al paciente", () => {
    const result = patientBalance(
      [{ amount: 3000, ars_coverage: 2000, patient_amount: 1000, ars_status: "rechazado", voided_at: null }],
      []
    );
    expect(result).toEqual({ patientCharged: 3000, paid: 0, balance: 3000, arsPending: 0 });
  });

  it("un pago de más deja saldo a favor (negativo)", () => {
    const result = patientBalance(
      [{ amount: 1000, ars_coverage: 0, patient_amount: 1000, ars_status: "no_aplica", voided_at: null }],
      [{ amount: 1500, voided_at: null }]
    );
    expect(result.balance).toBe(-500);
  });
});
