import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/session";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in?next=/learn");
  return (
    <AppShell who={`${session.user.name} · ${session.user.email}`} role={(session.user.role as string) || "student"} area="learn">
      {children}
    </AppShell>
  );
}
