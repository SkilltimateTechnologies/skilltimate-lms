import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { courseBySlug, requireAccess, progressMap } from "@/services/courses";

export const dynamic = "force-dynamic";

export default async function CourseHome({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const session = await requireUser();
  const data = await courseBySlug(courseSlug);
  if (!data) notFound();
  await requireAccess(session.user, data.course.id);
  const allLessons = data.modules.flatMap((m) => m.lessons);
  const pm = await progressMap(session.user.id, allLessons.map((l) => l.id));
  const done = allLessons.filter((l) => pm.get(l.id)?.status === "completed").length;
  const pct = allLessons.length ? Math.round((100 * done) / allLessons.length) : 0;
  const next = allLessons.find((l) => pm.get(l.id)?.status !== "completed");

  return (
    <>
      <div className="main-head">
        <div style={{ minWidth: 0 }}>
          <p className="k" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-bright)", margin: 0, fontSize: "0.75rem", letterSpacing: "0.12em" }}>{data.course.certCode}</p>
          <h1>{data.course.title}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <span className={`ring lg${pct === 100 ? " done" : ""}`} style={{ ["--p" as never]: pct }} aria-label={`${pct}% complete`}>
            <b>{pct === 100 ? "✓" : `${pct}%`}</b>
          </span>
          {next && <Link className="btn" href={`/learn/${courseSlug}/${next.id}`}>{done === 0 ? "Start course" : "Continue"}</Link>}
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 24, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="mut">Course progress</span>
          <span className="mono">{done}/{allLessons.length} · {pct}%</span>
        </div>
        <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="curric">
        {data.modules.map((m, i) => (
          <div className="mod" key={m.id}>
            <div className="mt"><h3>{String(i + 1).padStart(2, "0")} · {m.title}</h3><span className="faint mono" style={{ fontSize: "0.78rem" }}>{m.lessons.length} lessons</span></div>
            {m.lessons.map((l) => {
              const st = pm.get(l.id)?.status;
              return (
                <Link href={`/learn/${courseSlug}/${l.id}`} className="lesson-row" key={l.id}>
                  <span className="kind">{l.kind}</span>
                  <span className="name">{l.title}</span>
                  {st === "completed" ? <span className="tick">✓ done</span> : st === "started" ? <span className="tick" style={{ color: "var(--warn)" }}>in progress</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
