"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Pool = { id: string; certCode: string; domainCode: string; title: string };
type Exam = { id: string; title: string; certCode: string; mode: string; durationMinutes: number; blueprint: { poolId: string; count: number }[]; passScaled: number; status: string };

export default function ExamManager({ pools, exams }: { pools: Pool[]; exams: Exam[] }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<null | { e?: Exam }>(null);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [cert, setCert] = useState("AZ-900");
  const [mode, setMode] = useState("simulation");
  const [duration, setDuration] = useState(45);
  const [pass, setPass] = useState(700);
  const [status, setStatus] = useState("published");
  const [rows, setRows] = useState<{ poolId: string; count: number }[]>([]);

  function open(e?: Exam) {
    setDrawer({ e });
    setTitle(e?.title ?? "");
    setCert(e?.certCode ?? "AZ-900");
    setMode(e?.mode ?? "simulation");
    setDuration(e?.durationMinutes ?? 45);
    setPass(e?.passScaled ?? 700);
    setStatus(e?.status ?? "published");
    setRows(e?.blueprint ?? (pools[0] ? [{ poolId: pools[0].id, count: 5 }] : []));
  }

  async function save() {
    setBusy(true);
    const res = await fetch("/api/studio/exams", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: drawer?.e?.id, title, certCode: cert, mode, durationMinutes: duration, passScaled: pass, status, blueprint: rows.filter((r) => r.poolId && r.count > 0) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setToast({ text: data.error || "Save failed", err: true }); return; }
    setDrawer(null);
    setToast({ text: "Exam saved" });
    router.refresh();
  }

  return (
    <>
      <div className="main-head">
        <h1>Exams</h1>
        <button className="btn small" onClick={() => open()}>+ Exam</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Exam</th><th>Mode</th><th>Blueprint</th><th>Clock</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td><b>{e.title}</b><br /><span className="faint mono" style={{ fontSize: "0.72rem" }}>{e.certCode}</span></td>
                <td>{e.mode}</td>
                <td className="mono" style={{ fontSize: "0.78rem" }}>
                  {e.blueprint.map((b) => {
                    const p = pools.find((x) => x.id === b.poolId);
                    return `${p?.domainCode ?? "?"}×${b.count}`;
                  }).join(" + ")} = {e.blueprint.reduce((n, b) => n + b.count, 0)}Q
                </td>
                <td className="mono">{e.mode === "simulation" ? `${e.durationMinutes}m` : "—"}</td>
                <td>{e.status === "published" ? <span className="tag ok">published</span> : <span className="tag warn">{e.status}</span>}</td>
                <td><button className="btn ghost small" onClick={() => open(e)}>Edit</button></td>
              </tr>
            ))}
            {exams.length === 0 && <tr><td colSpan={6} className="mut">No exams yet — create the first one.</td></tr>}
          </tbody>
        </table>
      </div>

      {drawer && (
        <>
          <div className="drawer-veil" onClick={() => setDrawer(null)} />
          <div className="drawer" role="dialog" aria-label="Exam editor">
            <h2>{drawer.e ? "Edit exam" : "New exam"}</h2>
            <div className="field"><label htmlFor="et">Title</label><input id="et" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="field"><label htmlFor="ec">Cert code</label><input id="ec" className="input mono" value={cert} onChange={(e) => setCert(e.target.value)} /></div>
            <div className="field">
              <label htmlFor="em">Mode</label>
              <select id="em" className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="simulation">simulation — hard clock, feedback at the end</option>
                <option value="practice">practice — instant feedback, no clock</option>
              </select>
            </div>
            {mode === "simulation" && (
              <div className="field"><label htmlFor="ed">Duration (minutes)</label><input id="ed" type="number" min={5} max={240} className="input mono" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
            )}
            <div className="field"><label htmlFor="ep">Pass mark (scaled /1000)</label><input id="ep" type="number" min={0} max={1000} className="input mono" value={pass} onChange={(e) => setPass(Number(e.target.value))} /></div>
            <div className="field">
              <label>Blueprint — questions drawn per pool</label>
              {rows.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <select className="input" style={{ flex: 1, minWidth: 0 }} value={r.poolId} onChange={(e) => setRows(rows.map((x, n) => (n === i ? { ...x, poolId: e.target.value } : x)))}>
                    {pools.map((p) => <option key={p.id} value={p.id}>{p.certCode} {p.domainCode} · {p.title}</option>)}
                  </select>
                  <input type="number" min={1} className="input mono" style={{ width: 84 }} value={r.count} onChange={(e) => setRows(rows.map((x, n) => (n === i ? { ...x, count: Number(e.target.value) } : x)))} aria-label="Count" />
                  <button className="mvbtn" aria-label="Remove row" onClick={() => setRows(rows.filter((_, n) => n !== i))}>✕</button>
                </div>
              ))}
              <button className="btn ghost small" onClick={() => pools[0] && setRows([...rows, { poolId: pools[0].id, count: 5 }])}>+ pool</button>
            </div>
            <div className="field">
              <label htmlFor="es">Status</label>
              <select id="es" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div className="drawer-actions">
              <button className={`btn${busy ? " loading" : ""}`} onClick={save} disabled={busy || !title.trim() || rows.length === 0}>Save exam</button>
              <button className="btn ghost" onClick={() => setDrawer(null)}>Cancel</button>
            </div>
          </div>
        </>
      )}
      {toast && <div className={`toast${toast.err ? " err" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}
