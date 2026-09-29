import { describe, expect, it } from "vitest";
import { isStrongPassword } from "./password";

describe("isStrongPassword", () => {
  it("acepta una contraseña que cumple todas las reglas", () => {
    expect(isStrongPassword("Clinica#2026")).toBe(true);
  });

  it("rechaza contraseñas cortas o incompletas", () => {
    expect(isStrongPassword("Cl#2026a")).toBe(false); // menos de 10
    expect(isStrongPassword("clinica#2026")).toBe(false); // sin mayúscula
    expect(isStrongPassword("CLINICA#2026")).toBe(false); // sin minúscula
    expect(isStrongPassword("Clinica#Dos")).toBe(false); // sin número
    expect(isStrongPassword("Clinica2026x")).toBe(false); // sin símbolo
  });
});
