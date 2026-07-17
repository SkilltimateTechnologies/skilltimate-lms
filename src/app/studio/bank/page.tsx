import { requireRole } from "@/lib/session";
import { listBank } from "@/services/studio";
import BankManager from "@/components/studio/BankManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Question bank · Studio" };

export default async function BankPage() {
  const session = await requireRole("admin", "instructor");
  const { pools, questions } = await listBank(session.user);
  return <BankManager pools={pools as never} questions={questions as never} />;
}
