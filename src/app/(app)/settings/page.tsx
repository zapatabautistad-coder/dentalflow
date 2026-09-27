import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configuración · DentalFlow" };

const settings = [
  { label: "Perfil de clínica", value: "Activo", detail: "Nombre principal: Bright Smile Dental" },
  { label: "Notificaciones", value: "Configuradas", detail: "Recordatorios por SMS y correo activos" },
  { label: "Integración", value: "Supabase", detail: "Base de datos conectada y sincronizada" },
  { label: "Seguridad", value: "Actualizada", detail: "Sesiones y permisos revisados hoy" },
];

const preferences = [
  { title: "Inicio de sesión", description: "Autenticación con correo y roles activos" },
  { title: "Citas por defecto", description: "Duración 30 min y recordatorio 24h antes" },
  { title: "Facturación", description: "Cobros y pagos con seguimiento automatizado" },
  { title: "Ecosistema", description: "Integración con WhatsApp y CRM incluidos" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" data-i18n="sidebar.settings">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">Ajustes operativos y configuración general de DentalFlow.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => (
          <div key={item.label} className="glass-card p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
            <p className="mt-4 text-lg font-black text-[#0F172A]">{item.value}</p>
            <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4 border-b border-white/70 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Preferencias</p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#0F172A]">Configuración operativa</h2>
          </div>
          <span className="rounded-full border border-[#0D9488]/20 bg-[#0D9488]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#0D9488]">
            sincronizado
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {preferences.map((item) => (
            <div key={item.title} className="rounded-[22px] border border-white/80 bg-white/40 p-4">
              <p className="text-sm font-black text-[#0F172A]">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
