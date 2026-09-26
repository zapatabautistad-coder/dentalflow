"use client";

import { useRouter } from "next/navigation";
import { addDaysToDateKey } from "@/lib/timezone";

export function DayNav({ dateKey }: { dateKey: string }) {
  const router = useRouter();

  function goTo(nextDateKey: string) {
    router.push(`/appointments?date=${nextDateKey}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Día anterior"
        onClick={() => goTo(addDaysToDateKey(dateKey, -1))}
        className="glass-button-light h-10 w-10 px-0 text-lg"
      >
        ‹
      </button>

      <input
        type="date"
        value={dateKey}
        onChange={(event) => event.target.value && goTo(event.target.value)}
        className="glass-input"
        aria-label="Elegir fecha"
      />

      <button
        type="button"
        aria-label="Día siguiente"
        onClick={() => goTo(addDaysToDateKey(dateKey, 1))}
        className="glass-button-light h-10 w-10 px-0 text-lg"
      >
        ›
      </button>
    </div>
  );
}
