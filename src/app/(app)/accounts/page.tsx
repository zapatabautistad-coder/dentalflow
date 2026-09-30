import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, ROLE_LABELS, type Role } from "@/lib/auth";
import { changeRole, createAccount, deactivateAccount, reactivateAccount } from "./actions";
import { ChangeRoleForm, CreateAccountForm, DeactivateForm, ReactivateForm } from "./account-forms";

export const metadata: Metadata = { title: "Cuentas · DentalFlow" };

type AccountRow = {
  id: string;
  full_name: string;
  role: Role;
  active: boolean;
  deactivated_at: string | null;
  deactivated_reason: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AccountsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/panel");

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data, error }, usersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, active, deactivated_at, deactivated_reason, created_at")
      .order("active", { ascending: false })
      .order("full_name", { ascending: true })
      .returns<AccountRow[]>(),
    admin ? admin.auth.admin.listUsers({ perPage: 1000 }) : Promise.resolve(null),
  ]);

  const emails = new Map<string, string>();
  for (const user of usersResult?.data?.users ?? []) {
    if (user.email) emails.set(user.id, user.email);
  }
  const accounts = data ?? [];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header>
        <h1 className="text-[1.6rem] font-black text-[#0F172A]" data-i18n="accounts.title">Cuentas</h1>
        <p className="mt-1 text-sm text-slate-600" data-i18n="accounts.subtitle">
          Crea cuentas para el personal, asigna su rol y desactívalas cuando dejen la clínica. Las cuentas no se borran.
        </p>
      </header>

      {!admin && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Falta configurar la clave del servidor (SUPABASE_SERVICE_ROLE_KEY). Puedes ver las cuentas, pero no crear,
          desactivar ni reactivar.
        </p>
      )}

      {admin && (
        <section className="crystal-card min-w-0 rounded-[22px] p-4">
          <h2 className="mb-3 text-base font-black text-[#0F172A]" data-i18n="accounts.new">Nueva cuenta</h2>
          <CreateAccountForm action={createAccount} />
        </section>
      )}

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" data-i18n="accounts.loadError">
          No se pudieron cargar las cuentas. Recarga la página.
        </p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {accounts.map((account) => {
            const isSelf = account.id === profile.userId;

            return (
              <li key={account.id} className={`crystal-card min-w-0 rounded-[20px] p-4 ${account.active ? "" : "opacity-80"}`}>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-[15px] font-bold text-[#0F172A]">
                      {account.full_name || "Sin nombre"}
                      {isSelf && <span className="ml-2 text-xs font-semibold text-slate-500">(tú)</span>}
                    </p>
                    <p className="break-words text-sm text-slate-600">{emails.get(account.id) ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ROLE_LABELS[account.role]} · Creada el {formatDate(account.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      account.active
                        ? "border-[#7DD3FC] bg-[#7DD3FC]/20 text-[#0369A1]"
                        : "border-slate-300 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {account.active ? "Activa" : "Desactivada"}
                  </span>
                </div>

                {!account.active && (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Desactivada{account.deactivated_at ? ` el ${formatDate(account.deactivated_at)}` : ""}. Motivo:{" "}
                    {account.deactivated_reason}
                  </p>
                )}

                {!isSelf && (
                  <div className="mt-3 flex min-w-0 flex-col gap-3">
                    {account.active ? (
                      <>
                        <ChangeRoleForm action={changeRole.bind(null, account.id)} currentRole={account.role} />
                        {admin && <DeactivateForm action={deactivateAccount.bind(null, account.id)} />}
                      </>
                    ) : (
                      admin && <ReactivateForm action={reactivateAccount.bind(null, account.id)} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
