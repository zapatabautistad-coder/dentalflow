import { TIME_ZONE, formatHour, formatShortDate, splitLocalDateTime } from "@/lib/timezone";
import { STATUS_META, type AppointmentStatus } from "../../appointments/status";

export type AuditRow = {
  id: number;
  table_name: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  profiles: { full_name: string } | null;
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  patients: {
    full_name: "Nombre",
    document_id: "Cédula",
    birth_date: "Fecha de nacimiento",
    phone: "Teléfono",
    email: "Correo",
    notes: "Notas",
    insurance_type: "Seguro",
    insurance_provider: "ARS",
    affiliate_number: "N.° de afiliado",
    archived_at: "Archivado",
    archived_reason: "Motivo de archivado",
  },
  patient_medical_history: {
    allergy_penicillin: "Alergia a penicilina / amoxicilina",
    allergy_local_anesthetic: "Alergia a anestésicos locales",
    allergy_nsaids: "Alergia a AINEs",
    allergy_latex: "Alergia al látex",
    allergies_other: "Otras alergias",
    takes_anticoagulants: "Anticoagulantes / antiagregantes",
    takes_bisphosphonates: "Bifosfonatos",
    current_medications: "Medicamentos actuales",
    has_diabetes: "Diabetes",
    has_hypertension: "Hipertensión",
    has_heart_disease: "Cardiopatía",
    is_pregnant: "Embarazo",
    conditions_other: "Otras condiciones",
  },
  queue: {
    status: "Estado del turno",
  },
  appointments: {
    starts_at: "Fecha y hora",
    duration_minutes: "Duración (min)",
    reason: "Motivo",
    status: "Estado",
    doctor_id: "Doctor",
  },
};

const TITLES: Record<string, Record<AuditRow["action"], string>> = {
  patients: { INSERT: "Paciente registrado", UPDATE: "Datos del paciente modificados", DELETE: "Paciente eliminado" },
  patient_medical_history: {
    INSERT: "Historial médico registrado",
    UPDATE: "Historial médico modificado",
    DELETE: "Historial médico eliminado",
  },
  appointments: { INSERT: "Cita creada", UPDATE: "Cita modificada", DELETE: "Cita eliminada" },
  queue: {
    INSERT: "Llegada a sala de espera",
    UPDATE: "Turno en sala de espera actualizado",
    DELETE: "Turno en sala de espera eliminado",
  },
  clinical_entries: {
    INSERT: "Entrada del registro clínico firmada",
    UPDATE: "Entrada del registro clínico modificada",
    DELETE: "Entrada del registro clínico eliminada",
  },
};

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

const QUEUE_STATUS_LABELS: Record<string, string> = {
  en_espera: "En espera",
  llamado: "Llamado",
  en_atencion: "En atención",
  atendido: "Atendido",
  cancelado: "Cancelado",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (field === "starts_at" && typeof value === "string") {
    return `${formatShortDate(splitLocalDateTime(value).dateKey)} ${formatHour(value)}`;
  }
  if (field === "archived_at" && typeof value === "string") return formatStamp(value);
  if (field === "status" && typeof value === "string" && value in QUEUE_STATUS_LABELS) {
    return QUEUE_STATUS_LABELS[value];
  }
  if (field === "status" && typeof value === "string") {
    return STATUS_META[value as AppointmentStatus]?.label ?? value;
  }
  if (field === "insurance_type") return value === "ars" ? "ARS" : value === "privado" ? "Privado" : String(value);
  if (field === "doctor_id") return "otro doctor";
  return String(value);
}

function describeChanges(row: AuditRow): string[] {
  const labels = FIELD_LABELS[row.table_name] ?? {};
  const lines: string[] = [];

  for (const [field, label] of Object.entries(labels)) {
    const before = row.old_data?.[field];
    const after = row.new_data?.[field];

    if (row.action === "INSERT") {
      if (row.table_name === "patient_medical_history" && (after === true || (typeof after === "string" && after))) {
        lines.push(`${label}: ${formatValue(field, after)}`);
      }
      continue;
    }

    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) {
      lines.push(`${label}: ${formatValue(field, before)} → ${formatValue(field, after)}`);
    }
  }

  return lines;
}

export function ChangeLog({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">Aún no hay cambios registrados.</p>;
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const changes = describeChanges(row);
        return (
          <li key={row.id} className="rounded-xl border border-white/80 bg-white/50 px-3 py-2.5">
            <p className="text-[15px] font-semibold text-[#0F172A]">{TITLES[row.table_name]?.[row.action] ?? row.table_name}</p>
            <p className="text-sm text-slate-600">
              {formatStamp(row.changed_at)} · {row.profiles?.full_name ?? "Usuario desconocido"}
            </p>
            {changes.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-sm text-slate-700">
                {changes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
