import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSession } from "@/lib/session";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in?next=/studio");
  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/learn");
  return (
    <AppShell who={`${session.user.name} · ${role}`} role={role} area="studio">
      {children}
    </AppShell>
  );
}
