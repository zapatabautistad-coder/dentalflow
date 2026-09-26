"use client";

import { useRouter } from "next/navigation";

export function PatientRow({
  href,
  clickable,
  children,
}: {
  href: string;
  clickable: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={clickable ? () => router.push(href) : undefined}
      className={`border-b border-white/40 last:border-0 ${
        clickable ? "cursor-pointer hover:bg-white/40" : ""
      }`}
    >
      {children}
    </tr>
  );
}
