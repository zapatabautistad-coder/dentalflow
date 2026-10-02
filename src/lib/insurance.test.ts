import { describe, expect, it } from "vitest";
import { arsName } from "./insurance";

describe("arsName", () => {
  it("no repite ARS si el nombre ya lo trae", () => {
    expect(arsName("ARS Humano")).toBe("ARS Humano");
    expect(arsName("ars Palic")).toBe("ars Palic");
  });

  it("agrega ARS cuando el nombre no lo trae", () => {
    expect(arsName("SENASA")).toBe("ARS SENASA");
    expect(arsName("Arsenal Salud")).toBe("ARS Arsenal Salud");
  });

  it("muestra un guion si no hay nombre", () => {
    expect(arsName(null)).toBe("ARS —");
    expect(arsName("  ")).toBe("ARS —");
  });
});
