import { requireProfile, ROLE_LABELS } from "@/lib/auth";
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
      <div className="flex min-h-screen w-full flex-col overflow-x-clip md:flex-row">
        <Sidebar fullName={profile.fullName} roleLabel={ROLE_LABELS[profile.role]} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 [overflow-wrap:anywhere] sm:px-6 sm:py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </>
  );
}
