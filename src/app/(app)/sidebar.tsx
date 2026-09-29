"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { formatHour } from "@/lib/timezone";
import { logout } from "./actions";
import { getNotifications, type NotificationItem } from "./notifications";

// Nombre de la clínica bajo el logo y en el perfil. Se cambia con
// NEXT_PUBLIC_CLINIC_NAME en .env.local, sin tocar el código.
const CLINIC_NAME = process.env.NEXT_PUBLIC_CLINIC_NAME || "Bright Smile Dental";

type IconName =
  | "home"
  | "turnos"
  | "users"
  | "tooth"
  | "calendar"
  | "clock"
  | "file"
  | "card"
  | "chart"
  | "settings"
  | "logout"
  | "menu"
  | "close";

// Íconos de línea (trazos estilo Lucide, licencia ISC) dibujados aquí
// para no añadir dependencias.
const ICONS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  turnos: (
    <>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h5" />
      <path d="M17.5 17.5 16 16.3V14" />
      <circle cx="16" cy="16" r="6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  tooth: (
    <>
      <path d="M12 5.5C10.3 4.2 8.9 3.5 7.3 3.5 4.8 3.5 3 5.4 3 8.2c0 2.1.8 3.5 1.5 4.9.6 1.3.7 2.8 1 4.5.4 2.3 1 3.4 2.1 3.4 1.2 0 1.6-1.4 1.9-3.2.3-1.7.9-3 2.5-3s2.2 1.3 2.5 3c.3 1.8.7 3.2 1.9 3.2 1.1 0 1.7-1.1 2.1-3.4.3-1.7.4-3.2 1-4.5.7-1.4 1.5-2.8 1.5-4.9 0-2.8-1.8-4.7-4.3-4.7-1.6 0-3 .7-4.7 2Z" />
      <path d="M6.6 7.4c.9-.9 2.6-1 4.2.2" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  card: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </>
  ),
  chart: (
    <>
      <path d="M3 21h18" />
      <path d="M6 17v-3" />
      <path d="M10 17V9" />
      <path d="M14 17v-5" />
      <path d="M18 17V5" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

function NotificationLabel({ item }: { item: NotificationItem }) {
  const labelKey =
    item.kind === "appointmentSoon"
      ? "notifications.appointmentSoon"
      : item.kind === "queueWaiting"
        ? "notifications.queueWaiting"
        : item.kind === "appointmentUnconfirmed"
          ? "notifications.appointmentUnconfirmed"
          : "notifications.missingHistory";
  const label =
    item.kind === "appointmentSoon"
      ? "Cita en los próximos 30 minutos:"
      : item.kind === "queueWaiting"
        ? "Paciente en sala de espera:"
        : item.kind === "appointmentUnconfirmed"
          ? "Cita sin confirmar:"
          : "Registrar historial médico de";

  return (
    <>
      <span data-i18n={labelKey}>{label}</span> {item.patientName}
      {item.startsAt ? ` · ${formatHour(item.startsAt)}` : ""}
    </>
  );
}

function NotificationPopover({
  id,
  mobile,
  items,
  error,
  loading,
}: {
  id: string;
  mobile?: boolean;
  items: NotificationItem[];
  error: boolean;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const language = window.localStorage.getItem("dentalflow-language") ?? "es";
    document.dispatchEvent(new CustomEvent("dentalflow-language-change", { detail: language }));
  }, [open, items, error, loading]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-controls={id}
        title="Notificaciones"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
      >
        <Icon name="tooth" className="h-6 w-6" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8FD3C4] px-1 text-[11px] font-black leading-none text-[#154360]">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <section
          id={id}
          role="dialog"
          aria-label="Notificaciones"
          aria-labelledby={`${id}-title`}
          className={`crystal-card fixed inset-x-4 top-[4.5rem] z-[60] max-h-[calc(100dvh-5rem)] min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl border border-white/80 bg-white/95 p-3 text-[#0F172A] shadow-xl backdrop-blur-xl md:absolute md:inset-x-auto md:right-0 md:top-full md:z-50 md:mt-2 md:max-h-[calc(100dvh-9rem)] md:w-64 ${mobile ? "" : "max-md:hidden"}`}
        >
          <h2 id={`${id}-title`} className="mb-2 px-1 text-sm font-bold text-[#0F172A]" data-i18n="notifications.title">
            Notificaciones
          </h2>
          {loading ? (
            <p className="px-1 py-4 text-sm text-slate-500" data-i18n="notifications.loading">Cargando notificaciones…</p>
          ) : error ? (
            <p role="alert" className="px-1 py-4 text-sm text-rose-700" data-i18n="notifications.error">
              No se pudieron cargar las notificaciones.
            </p>
          ) : items.length === 0 ? (
            <p className="px-1 py-4 text-sm text-slate-500" data-i18n="notifications.empty">
              Sin notificaciones pendientes.
            </p>
          ) : (
            <ul className="flex min-w-0 flex-col gap-1">
              {items.map((item) => (
                <li key={item.id} className="min-w-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block min-w-0 break-words rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-white/70 hover:text-[#154360]"
                  >
                    <NotificationLabel item={item} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// Módulos del menú, en el mismo orden del diseño. Los que no tienen `href`
// todavía no existen en la app: se ven igual pero no llevan a ninguna parte.
type NavItem = { label: string; key?: string; icon: IconName; href?: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { label: "PANEL", key: "sidebar.panel", icon: "home", href: "/panel" },
  { label: "PACIENTES", key: "sidebar.patients", icon: "users", href: "/patients" },
  { label: "CITAS", key: "sidebar.appointments", icon: "calendar", href: "/appointments" },
  { label: "SALA DE ESPERA", key: "sidebar.waitingRoom", icon: "turnos", href: "/waiting-room" },
  { label: "CUENTAS", key: "sidebar.accounts", icon: "settings", href: "/accounts", adminOnly: true },
];

const NAV_ITEM =
  "group relative flex items-center gap-3.5 overflow-hidden rounded-[22px] border px-3.5 py-2.5 text-[13px] font-black uppercase tracking-[0.08em] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.65)] transition-all duration-200 [@media(max-height:800px)]:py-1.5";

type ProfileProps = { fullName: string; roleLabel: string };
type SidebarProps = ProfileProps & { isAdmin: boolean };

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Brand({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href="/panel"
      onClick={onNavigate}
      aria-label="Ir al panel"
      className={`flex min-w-0 items-center gap-3.5 ${compact ? "" : "select-none border-b border-white/10 px-1 pb-5"}`}
    >
      <div
        className={`relative flex shrink-0 items-center justify-center transition-transform duration-200 hover:scale-105 ${
          compact ? "h-12 w-12" : "h-20 w-20"
        }`}
      >
        {/* Ícono 3D: disco de vidrio con el diente, con sombra de profundidad y brillo aguamarina */}
        <Image
          src="/dentalflow-app-icon.png"
          alt="DentalFlow"
          width={512}
          height={512}
          priority
          className="h-full w-full [filter:drop-shadow(0_12px_14px_rgba(4,20,30,0.55))_drop-shadow(0_0_10px_rgba(143,211,196,0.6))]"
        />

        <span className={`absolute flex h-3 w-3 ${compact ? "right-0 top-0" : "right-1.5 top-1.5"}`}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8FD3C4] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-[#8FD3C4] shadow-sm" />
        </span>
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-white drop-shadow-sm">
          DentalFlow
        </span>
        <span aria-hidden="true" className="my-2 block h-px w-7 bg-gradient-to-r from-[#8FD3C4] to-transparent" />
        <span className="line-clamp-2 text-xs font-medium uppercase leading-[1.55] tracking-[0.08em] text-[#B8E6DE]/80">
          {CLINIC_NAME}
        </span>
      </div>
    </Link>
  );
}

function NavList({ pathname, isAdmin, onNavigate }: { pathname: string; isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-1">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        if (!item.href) {
          return (
            <div
              key={item.label}
              aria-disabled="true"
              className={`${NAV_ITEM} cursor-default border-transparent text-white/90`}
            >
              <Icon name={item.icon} className="h-[22px] w-[22px] shrink-0" />
              <span className="min-w-0 flex-1 truncate" data-i18n={item.key ?? item.label}>{item.label}</span>
            </div>
          );
        }

        const href = item.href;
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.label}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`${NAV_ITEM} ${
              active
                ? "border-white/30 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_14px_28px_-18px_rgba(143,211,196,0.9)] before:absolute before:inset-x-2 before:top-0 before:h-8 before:rounded-full before:bg-[radial-gradient(circle,_rgba(143,211,196,0.52),_transparent_68%)] before:blur-lg before:content-['']"
                : "border-transparent bg-white/[0.03] text-white/85 hover:border-white/20 hover:bg-white/8 hover:text-white"
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                active
                  ? "border-white/25 bg-white/12 text-[#D6F7F1] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : "border-white/10 bg-white/[0.04] text-white/80"
              }`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
            </span>
            <span className="min-w-0 flex-1 truncate" data-i18n={item.key ?? item.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const LANGUAGE_OPTIONS = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
];

function applySelectedLanguage(lang: (typeof LANGUAGE_OPTIONS)[number]) {
  document.documentElement.lang = lang.code;
  const event = new CustomEvent("dentalflow-language-change", { detail: lang.code });
  document.dispatchEvent(event);
  window.localStorage.setItem("dentalflow-language", lang.code);
}

function LanguageToggle() {
  const [selected, setSelected] = useState(LANGUAGE_OPTIONS[0]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const syncFromStorage = () => {
      const stored = window.localStorage.getItem("dentalflow-language") ?? "es";
      const storedOption = LANGUAGE_OPTIONS.find((language) => language.code === stored);
      if (storedOption) setSelected(storedOption);
    };
    syncFromStorage();
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Seleccionar idioma"
        onClick={() => setOpen((value) => !value)}
        className={`lang-toggle relative flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-white transition-all duration-200 ease-out ${
          open ? "border-white/45 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_0_1px_rgba(143,211,196,0.18)]" : "border-white/20 bg-white/5 hover:border-white/35 hover:bg-white/8"
        }`}
      >
        <span className="text-xs font-black uppercase tracking-[0.08em] text-white/60">Idioma</span>
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-2 py-0.5 text-xs font-bold tracking-[0.08em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8FD3C4] shadow-[0_0_10px_rgba(143,211,196,0.8)]" />
          {selected.code.toUpperCase()}
        </span>
      </button>

      <div
        className={`absolute inset-x-0 top-[calc(100%+0.55rem)] z-20 origin-top overflow-hidden rounded-2xl border border-white/15 bg-[#0f3149]/96 p-1.5 shadow-[0_18px_42px_-20px_rgba(15,23,42,0.8)] backdrop-blur-xl transition-all duration-220 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open
            ? "pointer-events-auto scale-y-100 opacity-100 translate-y-0"
            : "pointer-events-none scale-y-95 opacity-0 -translate-y-1"
        }`}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="max-h-72 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = selected.code === lang.code;

            return (
              <button
                key={lang.code}
                type="button"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - rect.left) / rect.width) * 100;
                  const y = ((event.clientY - rect.top) / rect.height) * 100;
                  event.currentTarget.style.setProperty("--x", `${x}%`);
                  event.currentTarget.style.setProperty("--y", `${y}%`);
                  event.currentTarget.style.background = active
                    ? "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(143,211,196,0.14))"
                    : "radial-gradient(circle at var(--x) var(--y), rgba(143,211,196,0.22), transparent 26%), rgba(255,255,255,0.02)";
                  event.currentTarget.style.boxShadow = active
                    ? "inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(143,211,196,0.18)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = active ? "rgba(255,255,255,0.12)" : "transparent";
                  event.currentTarget.style.boxShadow = active ? "inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(143,211,196,0.18)" : "none";
                }}
                onClick={() => {
                  setSelected(lang);
                  applySelectedLanguage(lang);
                  setOpen(false);
                }}
                className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl px-2.5 py-2 text-left text-[13px] transition-all duration-150 ${
                  active ? "text-white" : "text-white/80 hover:text-white"
                }`}
                style={{
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(143,211,196,0.18)" : "none",
                }}
              >
                <span className="relative z-10">{lang.name}</span>
                <span
                  className={`relative z-10 text-xs font-black uppercase tracking-[0.08em] transition-opacity duration-150 ${
                    active ? "text-[#8FD3C4] opacity-100" : "opacity-0"
                  }`}
                >
                  {active ? "ON" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ fullName, roleLabel }: ProfileProps) {
  return (
    <div className="profile-glass rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8FD3C4] text-sm font-bold text-[#154360] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_14px_-6px_rgba(6,28,40,0.7)]">
          {initialsOf(fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{fullName}</p>
          <p className="truncate text-xs text-white/70">
            {roleLabel} · {CLINIC_NAME}
          </p>
        </div>
      </div>

      <form action={logout} className="mt-3 border-t border-white/15 pt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="logout" className="h-5 w-5" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function SidebarFooter({ fullName, roleLabel }: ProfileProps) {
  return (
    <div className="space-y-4">
      <div className="px-2 [@media(max-height:860px)]:hidden">
        <p className="text-[15px] leading-snug text-white/85">
          Sonrisas
          <br />
          que inspiran
          <br />
          vidas mejores
        </p>
        <span aria-hidden="true" className="mt-3 block h-px w-10 bg-[#8FD3C4]/80" />
      </div>
      <LanguageToggle />
      <ProfileCard fullName={fullName} roleLabel={roleLabel} />
    </div>
  );
}

// Molar 3D del logo, grande y recortado, como molar decorativo de fondo.
function Watermark({ className }: { className: string }) {
  return (
    <Image
      src="/dentalflow-mark.png"
      alt=""
      aria-hidden="true"
      width={389}
      height={512}
      className={`sidebar-watermark pointer-events-none absolute w-auto select-none ${className}`}
    />
  );
}

export function Sidebar({ fullName, roleLabel, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsError, setNotificationsError] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let isFetching = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const refresh = async () => {
      if (!active || document.visibilityState !== "visible" || isFetching) return;
      isFetching = true;
      try {
        const result = await getNotifications();
        if (!active) return;
        setNotifications(result.items);
        setNotificationsError(result.error);
        setNotificationsLoading(false);
      } catch {
        if (!active) return;
        setNotifications([]);
        setNotificationsError(true);
        setNotificationsLoading(false);
      } finally {
        isFetching = false;
      }
    };

    const stopPolling = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const startPolling = () => {
      if (document.visibilityState !== "visible" || interval) return;
      void refresh();
      interval = setInterval(() => void refresh(), 60_000);
    };

    const handleVisibilityChange = () => {
      stopPolling();
      startPolling();
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <div className="md:hidden">
        <header className="topbar-crystal sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3">
          <Brand compact />
          <div className="flex shrink-0 items-center gap-2">
            <NotificationPopover id="notifications-mobile" mobile items={notifications} error={notificationsError} loading={notificationsLoading} />
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div className="crystal-overlay fixed inset-0 z-50 overflow-hidden">
            <Watermark className="-right-20 bottom-28 h-[45%]" />

            <div className="relative z-10 flex h-full flex-col px-4 py-4">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Brand compact onNavigate={() => setMobileOpen(false)} />
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <Icon name="close" className="h-6 w-6" />
                </button>
              </div>

              <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-4">
                <NavList pathname={pathname} isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
              </div>

              <SidebarFooter fullName={fullName} roleLabel={roleLabel} />
            </div>
          </div>
        )}
      </div>

      <aside className="sidebar-crystal hidden shrink-0 flex-col overflow-hidden rounded-[28px] md:sticky md:top-3 md:m-3 md:flex md:h-[calc(100dvh-1.5rem)] md:w-72">
        <Watermark className="-right-24 top-[48%] h-[54%]" />

        <div className="relative z-10 flex h-full flex-col px-3.5 py-5">
          <div className="flex min-w-0 items-start gap-2 px-2.5 pb-6">
            <div className="min-w-0 flex-1">
              <Brand />
            </div>
            <NotificationPopover id="notifications-desktop" items={notifications} error={notificationsError} loading={notificationsLoading} />
          </div>

          <div className="sidebar-scroll -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            <NavList pathname={pathname} isAdmin={isAdmin} />
          </div>

          <div className="pt-4">
            <SidebarFooter fullName={fullName} roleLabel={roleLabel} />
          </div>
        </div>
      </aside>
    </>
  );
}
