"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "./actions";

const LINKS = [
  { href: "/panel", label: "Panel" },
  { href: "/patients", label: "Pacientes" },
  { href: "/appointments", label: "Citas" },
];

const SOON_LABELS = ["Turnos"];

const ACTIVE_LINK =
  "bg-gradient-to-r from-[#154360] to-[#1f5f84] text-white shadow-[0_10px_22px_-10px_rgba(21,67,96,0.75),inset_0_1px_0_rgba(255,255,255,0.28)]";
const IDLE_LINK = "text-[#154360] hover:bg-white/70 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]";
const SOON_ITEM =
  "flex cursor-not-allowed items-center justify-between rounded-2xl border border-white/70 bg-white/30 font-semibold text-[#4A6B80]";
const SOON_BADGE =
  "rounded-full border border-[#8FD3C4]/70 bg-[#8FD3C4]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#154360]";

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({
  fullName,
  roleLabel,
}: {
  fullName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const brand = (size: number, nameClass: string) => (
    <div className="flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div
          aria-hidden="true"
          className="absolute -inset-2 rounded-full blur-md"
          style={{
            background:
              "radial-gradient(circle, rgba(143,211,196,0.75) 0%, rgba(143,211,196,0) 70%)",
          }}
        />
        <Image
          src="/dentalflow-mark.png"
          alt="DentalFlow"
          width={389}
          height={512}
          style={{ height: size, width: "auto" }}
          className="relative drop-shadow-[0_8px_12px_rgba(21,67,96,0.35)]"
        />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4A6B80]">Clínica</div>
        <div className={`font-black tracking-tight text-[#154360] ${nameClass}`}>DentalFlow</div>
      </div>
    </div>
  );

  const profileCard = (
    <div className="crystal-inset rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#154360] to-[#2b7396] text-sm font-black text-white shadow-[0_6px_14px_-6px_rgba(21,67,96,0.7)]">
          {initialsOf(fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#154360]">{fullName}</p>
          <p className="truncate text-[11px] font-medium text-[#4A6B80]">{roleLabel}</p>
        </div>
      </div>

      <form action={logout} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-xl border border-[#154360]/15 bg-white/75 px-4 py-2 text-sm font-semibold text-[#154360] shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition hover:bg-white"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <header className="topbar-crystal sticky top-0 z-40 flex items-center justify-between px-4 py-3">
          {brand(44, "text-base")}

          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#154360]/15 bg-white/70 text-xl font-bold text-[#154360]"
          >
            ☰
          </button>
        </header>

        {mobileOpen && (
          <div className="crystal-overlay fixed inset-0 z-50">
            <div className="flex h-full flex-col px-4 py-5">
              <div className="mb-5 flex items-center justify-between">
                {brand(40, "text-sm")}

                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#154360]/15 bg-white/70 text-xl font-bold text-[#154360]"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto pb-6">
                <div className="space-y-2">
                  {LINKS.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold transition ${
                          active ? ACTIVE_LINK : IDLE_LINK
                        }`}
                      >
                        <span>{link.label}</span>
                        {active && <span className="h-2 w-2 rounded-full bg-[#8FD3C4]" />}
                      </Link>
                    );
                  })}

                  {SOON_LABELS.map((label) => (
                    <div key={label} className={`${SOON_ITEM} px-4 py-3 text-base`}>
                      <span>{label}</span>
                      <span className={SOON_BADGE}>Próx.</span>
                    </div>
                  ))}
                </div>

                {profileCard}
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="sidebar-crystal hidden h-screen w-72 shrink-0 flex-col justify-between px-4 py-6 md:sticky md:top-0 md:flex">
        <div>
          <div className="crystal-inset mb-8 rounded-2xl px-3 py-2.5">{brand(56, "text-xl")}</div>

          <nav className="flex flex-col gap-1.5">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    active ? ACTIVE_LINK : IDLE_LINK
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        active
                          ? "bg-[#8FD3C4] shadow-[0_0_0_4px_rgba(143,211,196,0.28),0_0_12px_rgba(143,211,196,0.9)]"
                          : "bg-[#154360]/25"
                      }`}
                    />
                    {link.label}
                  </span>
                  {active && <span className="h-2 w-2 rounded-full bg-[#8FD3C4]" />}
                </Link>
              );
            })}

            {SOON_LABELS.map((label) => (
              <div key={label} className={`${SOON_ITEM} px-3.5 py-2.5 text-sm`}>
                <span>{label}</span>
                <span className={SOON_BADGE}>Próx.</span>
              </div>
            ))}
          </nav>
        </div>

        {profileCard}
      </aside>
    </>
  );
}
