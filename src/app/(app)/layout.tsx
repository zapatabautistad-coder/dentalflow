import { requireProfile, ROLE_LABELS } from "@/lib/auth";
import { IdleLogout } from "./idle-logout";
import { LanguageBridge } from "./language-bridge";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <>
      <LanguageBridge />
      <IdleLogout />
      <div className="flex h-dvh w-full flex-col overflow-hidden md:flex-row">
        <Sidebar fullName={profile.fullName} roleLabel={ROLE_LABELS[profile.role]} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 [overflow-wrap:anywhere] sm:px-6 sm:py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </>
  );
}
