"use client";

import { useActionState } from "react";
import type { MedicalHistoryState } from "../actions";

export type MedicalHistoryValues = {
  allergy_penicillin: boolean;
  allergy_local_anesthetic: boolean;
  allergy_latex: boolean;
  allergy_nsaids: boolean;
  allergies_other: string | null;
  takes_anticoagulants: boolean;
  takes_bisphosphonates: boolean;
  current_medications: string | null;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_heart_disease: boolean;
  is_pregnant: boolean;
  conditions_other: string | null;
};

type Flag = { name: keyof MedicalHistoryValues; label: string; i18n: string };

const GROUPS: { title: string; i18n: string; flags: Flag[]; text: { name: keyof MedicalHistoryValues; label: string; i18n: string; placeholder: string } }[] = [
  {
    title: "Alergias",
    i18n: "medical.allergies",
    flags: [
      { name: "allergy_penicillin", label: "Penicilina / amoxicilina", i18n: "medical.allergy.penicillin" },
      { name: "allergy_local_anesthetic", label: "Anestésicos locales", i18n: "medical.allergy.anesthetic" },
      { name: "allergy_nsaids", label: "AINEs (ibuprofeno, aspirina)", i18n: "medical.allergy.nsaids" },
      { name: "allergy_latex", label: "Látex", i18n: "medical.allergy.latex" },
    ],
    text: { name: "allergies_other", label: "Otras alergias", i18n: "medical.allergies.other", placeholder: "Ej.: sulfas, yodo" },
  },
  {
    title: "Medicamentos",
    i18n: "medical.medications",
    flags: [
      { name: "takes_anticoagulants", label: "Anticoagulantes / antiagregantes", i18n: "medical.med.anticoagulants" },
      { name: "takes_bisphosphonates", label: "Bifosfonatos", i18n: "medical.med.bisphosphonates" },
    ],
    text: { name: "current_medications", label: "Medicamentos actuales", i18n: "medical.medications.current", placeholder: "Nombre y dosis" },
  },
  {
    title: "Condiciones",
    i18n: "medical.conditions",
    flags: [
      { name: "has_diabetes", label: "Diabetes", i18n: "medical.cond.diabetes" },
      { name: "has_hypertension", label: "Hipertensión", i18n: "medical.cond.hypertension" },
      { name: "has_heart_disease", label: "Cardiopatía", i18n: "medical.cond.heart" },
      { name: "is_pregnant", label: "Embarazo", i18n: "medical.cond.pregnancy" },
    ],
    text: { name: "conditions_other", label: "Otras condiciones", i18n: "medical.conditions.other", placeholder: "Ej.: asma, epilepsia" },
  },
];

export function MedicalHistoryForm({
  action,
  defaultValues,
}: {
  action: (prev: MedicalHistoryState, formData: FormData) => Promise<MedicalHistoryState>;
  defaultValues: MedicalHistoryValues | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="flex flex-col gap-2.5">
          <legend className="mb-1 text-sm font-bold text-[#154360]" data-i18n={group.i18n}>{group.title}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.flags.map((flag) => (
              <label
                key={flag.name}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/80 bg-white/55 px-3 py-2 text-[15px] text-slate-800 transition hover:border-[#8FD3C4] has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50"
              >
                <input
                  type="checkbox"
                  name={flag.name}
                  defaultChecked={Boolean(defaultValues?.[flag.name])}
                  className="h-5 w-5 shrink-0 accent-rose-600"
                />
                <span data-i18n={flag.i18n}>{flag.label}</span>
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span data-i18n={group.text.i18n}>{group.text.label}</span>
            <input
              type="text"
              name={group.text.name}
              maxLength={1000}
              defaultValue={(defaultValues?.[group.text.name] as string | null) ?? ""}
              placeholder={group.text.placeholder}
              className="glass-input text-[15px]"
            />
          </label>
        </fieldset>
      ))}

      {state && "error" in state && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state && "saved" in state && (
        <p role="status" className="rounded-xl border border-[#8FD3C4] bg-[#8FD3C4]/15 px-3 py-2 text-sm font-medium text-[#154360]">
          Historial médico guardado.
        </p>
      )}

      <button type="submit" disabled={pending} className="glass-button min-h-11 self-start text-[15px]">
        {pending ? "Guardando…" : "Guardar historial médico"}
      </button>
    </form>
  );
}
