"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./actions";

const LINKS = [
  { href: "/panel", label: "Panel" },
  { href: "/patients", label: "Pacientes" },
];

const SOON_LABELS = ["Citas", "Turnos"];

export function Sidebar({
  fullName,
  roleLabel,
}: {
  fullName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between bg-gradient-to-b from-brand-from to-brand-to px-5 py-8 text-white">
      <div>
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg font-bold backdrop-blur-md">
            D
          </div>
          <span className="text-lg font-bold">DentalFlow</span>
        </div>

        <nav className="flex flex-col gap-1">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/20 shadow-inner"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {SOON_LABELS.map((label) => (
            <div
              key={label}
              className="flex cursor-not-allowed items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-white/50"
            >
              {label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Próximamente
              </span>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/20 pt-4">
        <p className="truncate px-2 text-sm font-semibold">{fullName}</p>
        <p className="px-2 text-xs text-white/70">{roleLabel}</p>
        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md transition hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
