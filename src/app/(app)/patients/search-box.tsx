"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      const query = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
      router.replace(`${pathname}${query}`);
    }, 300);
  }

  return (
    <input
      key={defaultValue}
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Buscar por nombre o teléfono…"
      className="glass-input"
      aria-label="Buscar pacientes"
    />
  );
}
