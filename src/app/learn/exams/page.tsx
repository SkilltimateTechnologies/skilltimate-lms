import { requireUser } from "@/lib/session";
import { listExamsForUser } from "@/services/exams";
import Link from "next/link";
import StartExam from "@/components/StartExam";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mock exams" };

export default async function ExamsPage() {
  const session = await requireUser();
  const { exams, attempts } = await listExamsForUser(session.user);
  return (
    <>
      <div className="main-head">
        <h1>Mock exams</h1>
      </div>
      <div className="panel-grid" style={{ marginBottom: 32 }}>
        {exams.map((e) => {
          const mine = attempts.filter((a) => a.examId === e.id);
          const open = mine.find((a) => a.status === "in_progress");
          const best = mine.reduce<number | null>((m, a) => (a.scaledScore != null && (m === null || a.scaledScore > m) ? a.scaledScore : m), null);
          return (
            <div key={e.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="code" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-bright)", fontSize: "0.78rem", letterSpacing: "0.1em" }}>
                {e.certCode} · {e.mode === "simulation" ? `${e.durationMinutes} min · timed` : "practice · untimed"}
              </span>
              <h3 style={{ margin: 0 }}>{e.title}</h3>
              <p className="mut" style={{ margin: 0, fontSize: "0.86rem" }}>
                {e.mode === "simulation"
                  ? `Full exam conditions. Hard clock, scaled to 1000, pass at ${e.passScaled}. A fresh paper every sitting.`
                  : "Instant feedback after every question, with full explanations. No clock pressure."}
              </p>
              <div style={{ marginTop: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <StartExam examId={e.id} resume={Boolean(open)} />
                {best !== null && <span className="tag ok mono">best {best}</span>}
                {mine.filter((a) => a.status !== "in_progress").length > 0 && (
                  <span className="faint mono" style={{ fontSize: "0.78rem" }}>{mine.filter((a) => a.status !== "in_progress").length} attempt(s)</span>
                )}
              </div>
            </div>
          );
        })}
        {exams.length === 0 && <div className="panel"><p className="mut" style={{ margin: 0 }}>No exams published yet.</p></div>}
      </div>
      {attempts.filter((a) => a.status !== "in_progress").length > 0 && (
        <>
          <h2 style={{ fontSize: "1.25rem" }}>Attempt history</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Exam</th><th>Score</th><th>Result</th><th>Submitted</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {attempts.filter((a) => a.status !== "in_progress").map((a) => {
                  const exam = exams.find((e) => e.id === a.examId);
                  return (
                    <tr key={a.id}>
                      <td><b>{exam?.title}</b>{a.status === "auto_submitted" && <span className="faint"> · auto-submitted at time-up</span>}</td>
                      <td className="mono">{a.scaledScore}/1000</td>
                      <td>{a.passed ? <span className="tag ok">Pass</span> : <span className="tag danger">Below 700</span>}</td>
                      <td>{new Date(a.submittedAt ?? a.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td><Link href={`/learn/results/${a.id}`}>Report →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
