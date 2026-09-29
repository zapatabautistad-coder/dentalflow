import { describe, expect, it } from "vitest";
import { matchingMedicationAllergy, type MedicationAllergyHistory } from "./medication-allergy";

const base: MedicationAllergyHistory = {
  allergy_penicillin: false,
  allergy_nsaids: false,
  allergy_local_anesthetic: false,
  allergies_other: null,
};

describe("matchingMedicationAllergy", () => {
  it("reconoce AINEs en español e inglés", () => {
    const h = { ...base, allergy_nsaids: true };
    for (const name of ["Ibuprofeno", "Ibuprofen 400mg", "Diclofenac", "Ketorolac", "Naproxen", "Celecoxib", "Piroxicam", "Dolo-Neurobion"]) {
      expect(matchingMedicationAllergy(name, h), name).toBe("AINEs");
    }
  });

  it("reconoce penicilinas en español e inglés", () => {
    const h = { ...base, allergy_penicillin: true };
    for (const name of ["Amoxicilina", "Amoxicillin", "Augmentin 875", "Penicillin V"]) {
      expect(matchingMedicationAllergy(name, h), name).toBe("penicilina");
    }
  });

  it("reconoce anestésicos locales", () => {
    const h = { ...base, allergy_local_anesthetic: true };
    expect(matchingMedicationAllergy("Lidocaine 2%", h)).toBe("anestésicos locales");
  });

  it("no avisa si la alergia no está registrada ni coincide", () => {
    expect(matchingMedicationAllergy("Ibuprofeno", base)).toBeNull();
    expect(matchingMedicationAllergy("Paracetamol", { ...base, allergy_nsaids: true })).toBeNull();
  });

  it("compara con el texto de otras alergias por raíz", () => {
    const h = { ...base, allergies_other: "Sulfamidas, codeína" };
    expect(matchingMedicationAllergy("Codeina 30mg", h)).toBe("Sulfamidas, codeína");
    expect(matchingMedicationAllergy("Paracetamol", h)).toBeNull();
  });
});
