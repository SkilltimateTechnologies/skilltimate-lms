import Link from "next/link";
import { requireUser } from "@/lib/session";
import { myCourses } from "@/services/courses";
import { listExamsForUser } from "@/services/exams";
import RedeemCode from "@/components/RedeemCode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const session = await requireUser();
  const [mine, examData] = await Promise.all([myCourses(session.user), listExamsForUser(session.user)]);
  const scored = examData.attempts.filter((a) => a.status !== "in_progress");
  const best = scored.reduce<number | null>((m, a) => (a.scaledScore != null && (m === null || a.scaledScore > m) ? a.scaledScore : m), null);
  const first = session.user.name.split(" ")[0];

  return (
    <>
      <div className="main-head">
        <h1>Welcome back, {first}</h1>
        {best !== null && <span className="tag ok mono">Best mock · {best}/1000</span>}
      </div>
      <div style={{ display: "grid", gap: 24 }}>
        <RedeemCode />
        <section>
          <div className="section-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Your courses</h2>
          </div>
          {mine.length === 0 ? (
            <div className="panel">
              <p className="mut" style={{ margin: 0 }}>
                No courses unlocked yet. Redeem an access code above, or <Link href="/courses">browse the catalog</Link>.
              </p>
            </div>
          ) : (
            <div className="panel-grid">
              {mine.map(({ course, totalLessons, completed }) => {
                const pct = totalLessons ? Math.round((100 * completed) / totalLessons) : 0;
                return (
                  <Link key={course.id} href={`/learn/${course.slug}`} className="course-card">
                    <span className="code">{course.certCode}</span>
                    <h3>{course.title}</h3>
                    <div className="pbar" aria-label={`${pct}% complete`}><i style={{ width: `${pct}%` }} /></div>
                    <span className="meta"><span className="mono">{completed}/{totalLessons} lessons</span><span>{pct}%</span></span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <section>
          <div className="section-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Recent mock attempts</h2>
            <Link href="/learn/exams" className="mut">All exams →</Link>
          </div>
          {scored.length === 0 ? (
            <div className="panel"><p className="mut" style={{ margin: 0 }}>No attempts yet — your first mock is waiting in <Link href="/learn/exams">Mock exams</Link>.</p></div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Exam</th><th>Score</th><th>Result</th><th>When</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {scored.slice(0, 6).map((a) => {
                    const exam = examData.exams.find((e) => e.id === a.examId);
                    return (
                      <tr key={a.id}>
                        <td><b>{exam?.title ?? "Exam"}</b></td>
                        <td className="mono">{a.scaledScore}/1000</td>
                        <td>{a.passed ? <span className="tag ok">Pass</span> : <span className="tag danger">Below 700</span>}</td>
                        <td>{new Date(a.submittedAt ?? a.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                        <td><Link href={`/learn/results/${a.id}`}>Report →</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
