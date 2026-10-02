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
  guest_expires_at: string | null;
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

  const [{ data, error }, usersResult, requestsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, active, deactivated_at, deactivated_reason, created_at, guest_expires_at")
      .order("active", { ascending: false })
      .order("full_name", { ascending: true })
      .returns<AccountRow[]>(),
    admin ? admin.auth.admin.listUsers({ perPage: 1000 }) : Promise.resolve(null),
    supabase
      .from("access_requests")
      .select("id, profile_id, created_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .returns<{ id: string; profile_id: string; created_at: string }[]>(),
  ]);
  const requests = requestsResult.data ?? [];

  const emails = new Map<string, string>();
  for (const user of usersResult?.data?.users ?? []) {
    if (user.email) emails.set(user.id, user.email);
  }
  const accounts = data ?? [];
  const nameOf = new Map(accounts.map((account) => [account.id, account.full_name]));
  const now = new Date().getTime();

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

      {requests.length > 0 && (
        <section role="alert" className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <h2 className="text-base font-bold text-amber-900" data-i18n="accounts.requests">Visitas que quieren entrar otra vez</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-amber-900">
            {requests.map((request) => (
              <li key={request.id}>
                {nameOf.get(request.profile_id) ?? "—"} · {emails.get(request.profile_id) ?? "—"} · {formatDate(request.created_at)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800" data-i18n="accounts.requestsHint">
            Para dejarlo entrar, busca su cuenta abajo y toca «Dar acceso otra vez».
          </p>
        </section>
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
                      <span data-i18n={`role.${account.role}`}>{ROLE_LABELS[account.role]}</span> · <span data-i18n="accounts.createdOn">Creada el</span> {formatDate(account.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      account.active
                        ? "border-[#95D3FA] bg-[#95D3FA]/20 text-[#0766B5]"
                        : "border-slate-300 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {account.active ? <span data-i18n="accounts.active">Activa</span> : <span data-i18n="accounts.inactive">Desactivada</span>}
                  </span>
                </div>

                {account.active && account.guest_expires_at && (
                  <p className="mt-2 rounded-xl bg-[#95D3FA]/20 px-3 py-2 text-sm text-[#0766B5]">
                    {new Date(account.guest_expires_at).getTime() > now ? (
                      <>
                        <span data-i18n="accounts.guestUntil">Cuenta temporal: acceso hasta</span>{" "}
                        {new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "medium", timeStyle: "short" }).format(new Date(account.guest_expires_at))}
                      </>
                    ) : (
                      <span data-i18n="accounts.guestExpired">Cuenta temporal: el acceso ya venció.</span>
                    )}
                  </p>
                )}

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
                      admin && <ReactivateForm action={reactivateAccount.bind(null, account.id)} isGuest={Boolean(account.guest_expires_at)} />
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
