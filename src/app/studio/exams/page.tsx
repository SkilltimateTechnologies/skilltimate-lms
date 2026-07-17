import { requireRole } from "@/lib/session";
import { db, schema } from "@/db";
import { asc, desc } from "drizzle-orm";
import ExamManager from "@/components/studio/ExamManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Exams · Studio" };

export default async function ExamsAdminPage() {
  await requireRole("admin", "instructor");
  const pools = await db.query.questionPools.findMany({ orderBy: [asc(schema.questionPools.certCode), asc(schema.questionPools.domainCode)] });
  const exams = await db.query.exams.findMany({ orderBy: [desc(schema.exams.createdAt)] });
  return <ExamManager pools={pools as never} exams={exams as never} />;
}
