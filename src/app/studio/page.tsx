import { requireRole } from "@/lib/session";
import { studioOverview } from "@/services/studio";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio" };

export default async function StudioHome() {
  const session = await requireRole("admin", "instructor");
  const o = await studioOverview(session.user);
  const userById = new Map(o.users.map((u) => [u.id, u]));
  const examById = new Map(o.exams.map((e) => [e.id, e]));
  return (
    <>
      <div className="main-head"><h1>Studio overview</h1></div>
      <div className="kpis">
        <div className="kpi"><span className="n">{o.students}</span><span className="l">Students</span></div>
        <div className="kpi"><span className="n">{o.grants}</span><span className="l">Course grants</span></div>
        <div className="kpi"><span className="n">{o.liveQuestions}</span><span className="l">Live questions</span></div>
        <div className="kpi"><span className="n">{o.attempts}</span><span className="l">Exam attempts</span></div>
      </div>
      <div className="split">
        <div>
          <h2 style={{ fontSize: "1.2rem" }}>Recent attempts</h2>
          {o.recent.length === 0 ? <div className="panel"><p className="mut" style={{margin:0}}>No attempts yet.</p></div> : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Status</th></tr></thead>
                <tbody>
                  {o.recent.map((a) => (
                    <tr key={a.id}>
                      <td><b>{userById.get(a.userId)?.name ?? "—"}</b></td>
                      <td>{examById.get(a.examId)?.title ?? "—"}</td>
                      <td className="mono">{a.scaledScore != null ? `${a.scaledScore}/1000` : "—"}</td>
                      <td>{a.status === "in_progress" ? <span className="tag warn">in progress</span> : a.passed ? <span className="tag ok">pass</span> : <span className="tag danger">fail</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h2 style={{ fontSize: "1.2rem" }}>Recent activity</h2>
          <div className="panel">
            {o.activity.length === 0 && <p className="mut" style={{margin:0}}>Nothing logged yet.</p>}
            {o.activity.map((a) => (
              <p key={a.id} style={{ margin: "0 0 8px", fontSize: "0.85rem" }} className="mut">
                <span className="mono faint">{new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>{" "}
                <b style={{ color: "var(--ink)" }}>{userById.get(a.userId)?.name?.split(" ")[0] ?? "?"}</b> {a.action} {a.entity}{a.detail ? ` · ${a.detail}` : ""}
              </p>
            ))}
            <p style={{ margin: "12px 0 0" }}><Link href="/studio/courses">Manage courses →</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
