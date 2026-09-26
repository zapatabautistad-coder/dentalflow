import { STATUS_META, type AppointmentStatus } from "./status";

export function StatusChip({ status }: { status: string }) {
  const meta =
    STATUS_META[status as AppointmentStatus] ??
    ({
      label: status,
      dot: "bg-slate-400",
      text: "text-slate-700",
      bg: "bg-slate-100",
      border: "border-slate-200",
    } as const);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.border} ${meta.bg} ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
