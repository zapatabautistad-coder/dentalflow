import { describe, expect, it } from "vitest";
import { medicalAlerts, type MedicalHistoryAlerts } from "./medical-alerts";

describe("medicalAlerts", () => {
  it("returns no alerts when the history is missing or has no flags", () => {
    expect(medicalAlerts(null)).toEqual([]);
    expect(medicalAlerts(undefined)).toEqual([]);
    expect(medicalAlerts({})).toEqual([]);
    expect(medicalAlerts({ allergy_penicillin: false, allergies_other: "  " })).toEqual([]);
  });

  it("returns each present fixed alert and trims other allergy detail", () => {
    const history: MedicalHistoryAlerts = {
      allergy_penicillin: true,
      allergy_local_anesthetic: true,
      allergy_latex: true,
      allergy_nsaids: true,
      allergies_other: "  Sulfas  ",
      takes_anticoagulants: true,
      takes_bisphosphonates: true,
      has_hypertension: true,
      has_diabetes: true,
      has_heart_disease: true,
      is_pregnant: true,
    };

    expect(medicalAlerts(history)).toEqual([
      { key: "penicillin" },
      { key: "localAnesthetic" },
      { key: "latex" },
      { key: "nsaids" },
      { key: "otherAllergy", detail: "Sulfas" },
      { key: "anticoagulants" },
      { key: "bisphosphonates" },
      { key: "hypertension" },
      { key: "diabetes" },
      { key: "heartDisease" },
      { key: "pregnancy" },
    ]);
  });

  it("includes only alerts present in the history", () => {
    expect(medicalAlerts({ allergy_latex: true, has_diabetes: true })).toEqual([
      { key: "latex" },
      { key: "diabetes" },
    ]);
  });
});