import { requireProfile, ROLE_LABELS } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen w-full flex-1">
      <Sidebar fullName={profile.fullName} roleLabel={ROLE_LABELS[profile.role]} />
      <main className="flex-1 px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}
