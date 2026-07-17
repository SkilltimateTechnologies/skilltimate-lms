"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Seg = { id: string; title: string; done: boolean; current: boolean; href: string };

export default function CourseBar({
  segments, lessonId, done, prevHref, nextHref, courseCode, index, total,
}: {
  segments: Seg[]; lessonId: string; done: boolean;
  prevHref?: string | null; nextHref?: string | null;
  courseCode: string; index: number; total: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [isDone, setIsDone] = useState(done);
  const [justDone, setJustDone] = useState(false);
  const doneCount = segments.filter((s) => s.done).length + (isDone && !done ? 1 : 0);
  const pct = Math.round((100 * doneCount) / Math.max(total, 1));

  async function complete() {
    setBusy(true);
    const res = await fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, status: "completed" }),
    });
    setBusy(false);
    if (res.ok) { setIsDone(true); setJustDone(true); router.refresh(); }
  }

  return (
    <div className="cbar" role="navigation" aria-label="Course progress">
      <div className="cbar-in">
        <div className="cbar-info">
          <span className="cc mono">{courseCode}</span>
          <span className="cp">Lesson {index + 1} of {total}</span>
          <span className={`cpc mono${pct === 100 ? " full" : ""}`}>{pct}%</span>
        </div>

        <div className="cbar-track" aria-label={`${doneCount} of ${total} lessons complete`}>
          {segments.map((s) => {
            const segDone = s.done || (s.id === lessonId && isDone);
            return (
              <Link
                key={s.id} href={s.href} title={s.title}
                className={`seg${segDone ? " d" : ""}${s.current ? " c" : ""}${justDone && s.id === lessonId ? " pop" : ""}`}
                aria-label={`${s.title}${segDone ? " — complete" : ""}`}
                aria-current={s.current ? "step" : undefined}
              />
            );
          })}
        </div>

        <div className="cbar-actions">
          {prevHref ? <Link className="btn ghost small" href={prevHref}>←</Link> : <span className="btn ghost small" aria-disabled="true" style={{ pointerEvents: "none", opacity: 0.4 }}>←</span>}
          {isDone ? (
            <span className="tag ok cbar-done">✓ Done</span>
          ) : (
            <button className={`btn success small${busy ? " loading" : ""}`} disabled={busy} onClick={complete}>Mark complete</button>
          )}
          {nextHref ? <Link className="btn small" href={nextHref}>Next →</Link> : <Link className="btn small" href="/learn/exams">To mock exams →</Link>}
        </div>
      </div>
    </div>
  );
}
