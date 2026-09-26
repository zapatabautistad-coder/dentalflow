import { requireProfile, ROLE_LABELS } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden md:flex-row">
      <Sidebar fullName={profile.fullName} roleLabel={ROLE_LABELS[profile.role]} />
      <main className="min-w-0 flex-1 overflow-y-auto px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}
