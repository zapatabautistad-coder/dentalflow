"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = (
    <>
      <nav className="flex flex-col gap-1.5">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : "text-white/85 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    active ? "bg-[#8FD3C4] shadow-[0_0_0_4px_rgba(143,211,196,0.18)]" : "bg-white/35"
                  }`}
                />
                {link.label}
              </span>
              {active && <span className="h-2 w-2 rounded-full bg-[#8FD3C4]" />}
            </Link>
          );
        })}

        {SOON_LABELS.map((label) => (
          <div
            key={label}
            className="flex cursor-not-allowed items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-sm font-semibold text-white/75"
          >
            <span>{label}</span>
            <span className="rounded-full border border-[#8FD3C4]/30 bg-[#8FD3C4]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#dffaf3]">
              Próx.
            </span>
          </div>
        ))}
      </nav>
    </>
  );

  const profileCard = (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-sm font-black text-white">
          {fullName
            .split(" ")
            .map((word) => word[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{fullName}</p>
          <p className="truncate text-[11px] text-white/70">{roleLabel}</p>
        </div>
      </div>

      <form action={logout} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <header className="sidebar-glass sticky top-0 z-40 flex items-center justify-between px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Image
              src="/dentalflow-icon.png"
              alt="DentalFlow"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 drop-shadow-[0_4px_12px_rgba(143,211,196,0.45)]"
            />
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/70">Clínica</div>
              <div className="text-base font-black tracking-tight">DentalFlow</div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl font-bold text-white"
          >
            ☰
          </button>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-[rgba(21,67,96,0.96)] text-white">
            <div className="flex h-full flex-col px-4 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/dentalflow-icon.png"
                    alt="DentalFlow"
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 drop-shadow-[0_4px_12px_rgba(143,211,196,0.45)]"
                  />
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/70">Clínica</div>
                    <div className="text-sm font-black tracking-tight">DentalFlow</div>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl font-bold text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto pb-6">
                <div className="space-y-2">
                  {LINKS.map((link) => {
                    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold ${
                          active ? "bg-white/12 text-white" : "text-white/85"
                        }`}
                      >
                        <span>{link.label}</span>
                        {active && <span className="h-2 w-2 rounded-full bg-[#8FD3C4]" />}
                      </Link>
                    );
                  })}

                  {SOON_LABELS.map((label) => (
                    <div
                      key={label}
                      className="flex cursor-not-allowed items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-base font-semibold text-white/75"
                    >
                      <span>{label}</span>
                      <span className="rounded-full border border-[#8FD3C4]/30 bg-[#8FD3C4]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#dffaf3]">
                        Próx.
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/6 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-sm font-black text-white">
                      {fullName
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{fullName}</p>
                      <p className="truncate text-[11px] text-white/70">{roleLabel}</p>
                    </div>
                  </div>

                  <form action={logout} className="mt-3">
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/16"
                    >
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="sidebar-glass hidden h-screen w-72 shrink-0 flex-col justify-between px-4 py-6 text-white md:sticky md:top-0 md:flex">
        <div>
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Image
              src="/dentalflow-icon.png"
              alt="DentalFlow"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 drop-shadow-[0_6px_18px_rgba(143,211,196,0.5)]"
            />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Clínica</div>
              <div className="text-xl font-black tracking-tight">DentalFlow</div>
            </div>
          </div>

          {navigation}
        </div>

        {profileCard}
      </aside>
    </>
  );
}
