// Alerta de alergias al registrar un medicamento (coincidencia por raíz).

function normalizeAllergyText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Coincidencia por raíz (prefijo) para cubrir español, inglés y variantes:
// "amoxicil" reconoce amoxicilina y amoxicillin.
function hasMedicationTerm(medication: string, stem: string): boolean {
  return normalizeAllergyText(medication)
    .split(" ")
    .some((word) => word.startsWith(stem));
}

// Dos palabras se consideran la misma sustancia si comparten las primeras 6 letras.
function sameSubstance(a: string, b: string): boolean {
  return a === b || (a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6));
}

export type MedicationAllergyHistory = {
  allergy_penicillin: boolean;
  allergy_nsaids: boolean;
  allergy_local_anesthetic: boolean;
  allergies_other: string | null;
};

export function matchingMedicationAllergy(
  medication: string,
  history: MedicationAllergyHistory
): string | null {
  const allergyGroups = [
    {
      recorded: history.allergy_penicillin,
      label: "penicilina",
      terms: [
        "penicilin",
        "penicillin",
        "amoxicil",
        "ampicil",
        "augmentin",
        "dicloxacil",
        "cefalexin",
        "cephalexin",
        "amoxil",
        "clavulin",
        "oxacil",
        "piperacil",
        "cefadroxil",
        "cefuroxim",
        "ceftriaxon",
        "cefazolin",
        "cefixim",
      ],
    },
    {
      recorded: history.allergy_nsaids,
      label: "AINEs",
      terms: [
        "ibuprofen",
        "naproxen",
        "diclofenac",
        "ketorolac",
        "ketoprofen",
        "aspirin",
        "acetilsalicil",
        "acetylsalicyl",
        "meloxicam",
        "piroxicam",
        "celecoxib",
        "etoricoxib",
        "indomet",
        "nimesulid",
        "neurobion",
        "advil",
        "motrin",
        "voltaren",
        "cataflam",
      ],
    },
    {
      recorded: history.allergy_local_anesthetic,
      label: "anestésicos locales",
      terms: ["lidocain", "xilocain", "xylocain", "articain", "septocain", "mepivacain", "carbocain", "scandonest", "bupivacain", "prilocain", "citanest"],
    },
  ];

  for (const group of allergyGroups) {
    if (group.recorded && group.terms.some((term) => hasMedicationTerm(medication, term))) {
      return group.label;
    }
  }

  const otherAllergy = history.allergies_other?.trim();
  if (otherAllergy) {
    const isWord = (term: string) => /[a-z]{4,}/.test(term);
    const medicationTerms = normalizeAllergyText(medication).split(" ").filter(isWord);
    const otherTerms = normalizeAllergyText(otherAllergy).split(" ").filter(isWord);
    if (medicationTerms.some((term) => otherTerms.some((other) => sameSubstance(term, other)))) {
      return otherAllergy;
    }
  }

  return null;
}
