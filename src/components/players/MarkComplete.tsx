"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkComplete({ lessonId, done, nextHref }: { lessonId: string; done: boolean; nextHref?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [isDone, setIsDone] = useState(done);
  const router = useRouter();
  async function complete() {
    setBusy(true);
    const res = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, status: "completed" }) });
    setBusy(false);
    if (res.ok) { setIsDone(true); router.refresh(); }
  }
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
      {isDone ? (
        <span className="tag ok">✓ Lesson complete</span>
      ) : (
        <button className={`btn success${busy ? " loading" : ""}`} disabled={busy} onClick={complete}>Mark as complete</button>
      )}
      {nextHref && <a className="btn ghost" href={nextHref}>Next lesson →</a>}
    </div>
  );
}
