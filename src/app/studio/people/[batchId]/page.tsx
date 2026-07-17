import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { gradebook } from "@/services/studio";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gradebook · Studio" };

export default async function GradebookPage({ params }: { params: Promise<{ batchId: string }> }) {
  const session = await requireRole("admin", "instructor");
  const { batchId } = await params;
  const batch = await db.query.batches.findFirst({ where: eq(schema.batches.id, batchId) });
  if (!batch) notFound();
  const { users, attempts, exams } = await gradebook(session.user, batchId);
  return (
    <>
      <div className="main-head">
        <div>
          <p className="faint" style={{ margin: 0, fontSize: "0.8rem" }}><Link className="mut" href="/studio/people">People</Link> · gradebook</p>
          <h1 style={{ marginTop: 4 }}>{batch.name}</h1>
        </div>
      </div>
      {users.length === 0 ? (
        <div className="panel"><p className="mut" style={{ margin: 0 }}>No members yet — provision students from the People page.</p></div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Student</th><th>Attempts</th><th>Best score</th><th>Latest</th><th>Status</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const mine = attempts.filter((a) => a.userId === u.id && a.status !== "in_progress");
                const best = mine.reduce<number | null>((m, a) => (a.scaledScore != null && (m === null || a.scaledScore > m) ? a.scaledScore : m), null);
                const latest = mine[0];
                return (
                  <tr key={u.id}>
                    <td><b>{u.name}</b><br /><span className="faint" style={{ fontSize: "0.78rem" }}>{u.email}</span></td>
                    <td className="mono">{mine.length}</td>
                    <td className="mono">{best !== null ? `${best}/1000` : "—"}</td>
                    <td>{latest ? `${exams.find((e) => e.id === latest.examId)?.certCode ?? ""} · ${latest.scaledScore}` : "—"}</td>
                    <td>{best !== null && best >= 700 ? <span className="tag ok">exam-ready</span> : mine.length > 0 ? <span className="tag warn">preparing</span> : <span className="faint">not started</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
