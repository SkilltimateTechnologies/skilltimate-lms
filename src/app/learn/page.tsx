import Link from "next/link";
import { requireUser } from "@/lib/session";
import { myCourses } from "@/services/courses";
import { listExamsForUser } from "@/services/exams";
import { playerStats, continueTarget } from "@/services/game";
import RedeemCode from "@/components/RedeemCode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const session = await requireUser();
  const [mine, examData, stats, cont] = await Promise.all([
    myCourses(session.user), listExamsForUser(session.user),
    playerStats(session.user.id), continueTarget(session.user.id),
  ]);
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
        <section className="gamer">
          <div className="g-cell g-level">
            <span className="ring" style={{ ["--p" as never]: stats.maxLevel ? 100 : Math.round((100 * stats.intoLevel) / stats.levelSpan) }}>
              <b>{stats.level}</b>
            </span>
            <div className="g-txt">
              <span className="g-t">Level {stats.level}</span>
              <span className="g-s mono">{stats.xp} XP{!stats.maxLevel && ` · ${stats.nextLevelAt - stats.xp} to next`}</span>
            </div>
          </div>
          <div className="g-cell">
            <span className={`flame${stats.streak > 0 ? " lit" : ""}`} aria-hidden="true">🔥</span>
            <div className="g-txt">
              <span className="g-t">{stats.streak > 0 ? `${stats.streak}-day streak` : "Start a streak"}</span>
              <span className="g-s">{stats.streak > 0 ? "Keep it going today" : "Finish any lesson today"}</span>
            </div>
          </div>
          <div className="g-cell g-week" aria-label="Activity this week">
            {stats.week.map((d, i) => (
              <span key={i} className={`wd${d.active ? " on" : ""}${d.today ? " td" : ""}`} title={d.active ? "Active" : "No activity"}>{d.label}</span>
            ))}
          </div>
          {cont && !cont.allDone && (
            <Link href={`/learn/${cont.courseSlug}/${cont.lessonId}`} className="btn g-cta">
              Continue: {cont.lessonTitle} →
            </Link>
          )}
        </section>
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
                    <span className="cc-top">
                      <span className="code">{course.certCode}</span>
                      <span className={`ring${pct === 100 ? " done" : ""}`} style={{ ["--p" as never]: pct }} aria-label={`${pct}% complete`}>
                        <b>{pct === 100 ? "✓" : `${pct}%`}</b>
                      </span>
                    </span>
                    <h3>{course.title}</h3>
                    <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
                    <span className="meta"><span className="mono">{completed} of {totalLessons} lessons complete</span></span>
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
