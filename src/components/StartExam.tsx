"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartExam({ examId, resume }: { examId: string; resume: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  async function start() {
    setBusy(true); setErr("");
    const res = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId }) });
    const data = await res.json();
    if (!res.ok) { setBusy(false); setErr(data.error || "Could not start the exam"); return; }
    router.push(`/exam/${data.attemptId}`);
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button className={`btn small${busy ? " loading" : ""}`} disabled={busy} onClick={start}>
        {resume ? "Resume attempt" : "Start attempt"}
      </button>
      {err && <span className="btn-err">{err}</span>}
    </span>
  );
}
