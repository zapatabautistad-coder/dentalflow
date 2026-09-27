"use client";

import { useRouter } from "next/navigation";
import { addDaysToDateKey } from "@/lib/timezone";

export function DayNav({ dateKey }: { dateKey: string }) {
  const router = useRouter();

  function goTo(nextDateKey: string) {
    router.push(`/appointments?date=${nextDateKey}`);
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <button
        type="button"
        aria-label="Día anterior"
        onClick={() => goTo(addDaysToDateKey(dateKey, -1))}
        className="glass-button-light h-11 w-11 shrink-0 px-0 text-lg"
      >
        ‹
      </button>

      <input
        type="date"
        value={dateKey}
        onChange={(event) => event.target.value && goTo(event.target.value)}
        className="glass-input min-w-0 flex-1"
        aria-label="Elegir fecha"
      />

      <button
        type="button"
        aria-label="Día siguiente"
        onClick={() => goTo(addDaysToDateKey(dateKey, 1))}
        className="glass-button-light h-11 w-11 shrink-0 px-0 text-lg"
      >
        ›
      </button>
    </div>
  );
}
