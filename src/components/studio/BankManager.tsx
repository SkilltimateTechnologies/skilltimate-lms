"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Pool = { id: string; certCode: string; domainCode: string; title: string };
type Question = { id: string; poolId: string; type: string; stemMd: string; options: any; answer: any; explanationMd: string; status: string; stats: { attempts: number; correct: number } | null };

const TYPES = ["single_choice", "multi_choice", "true_false", "fill_blank", "drag_order", "drag_match"] as const;

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function BankManager({ pools, questions }: { pools: Pool[]; questions: Question[] }) {
  const router = useRouter();
  const [activePool, setActivePool] = useState(pools[0]?.id ?? "");
  const [drawer, setDrawer] = useState<null | { q?: Question }>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // pool form
  const [pCert, setPCert] = useState("AZ-900");
  const [pDomain, setPDomain] = useState("");
  const [pTitle, setPTitle] = useState("");

  // question form
  const [qType, setQType] = useState<(typeof TYPES)[number]>("single_choice");
  const [stem, setStem] = useState("");
  const [choicesText, setChoicesText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [pairsLeft, setPairsLeft] = useState("");
  const [pairsRight, setPairsRight] = useState("");
  const [explanation, setExplanation] = useState("");
  const [qStatus, setQStatus] = useState("live");

  // CSV import
  const [csv, setCsv] = useState("");

  const visible = useMemo(() => questions.filter((q) => q.poolId === activePool), [questions, activePool]);

  function openQuestion(q?: Question) {
    setDrawer({ q });
    if (!q) {
      setQType("single_choice"); setStem(""); setChoicesText(""); setAnswerText(""); setPairsLeft(""); setPairsRight(""); setExplanation(""); setQStatus("live");
      return;
    }
    setQType(q.type as never);
    setStem(q.stemMd);
    setExplanation(q.explanationMd);
    setQStatus(q.status);
    if (q.type === "single_choice" || q.type === "multi_choice") {
      setChoicesText((q.options.choices as { text: string }[]).map((c) => c.text).join("\n"));
      setAnswerText(q.type === "single_choice" ? q.answer.choice : (q.answer.choices as string[]).join(","));
    } else if (q.type === "true_false") {
      setAnswerText(String(q.answer.value));
    } else if (q.type === "fill_blank") {
      setChoicesText(q.options.placeholder ?? "");
      setAnswerText((q.answer.accept as string[]).join(","));
    } else if (q.type === "drag_order") {
      setChoicesText((q.options.items as { text: string }[]).map((c) => c.text).join("\n"));
      setAnswerText((q.answer.order as string[]).join(","));
    } else if (q.type === "drag_match") {
      setPairsLeft((q.options.left as { text: string }[]).map((c) => c.text).join("\n"));
      setPairsRight((q.options.right as { text: string }[]).map((c) => c.text).join("\n"));
      setAnswerText(Object.entries(q.answer.pairs as Record<string, string>).map(([l, r]) => `${l}:${r}`).join(","));
    }
  }

  function build(): { options: Record<string, unknown>; answer: Record<string, unknown> } {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(97 + i));
    if (qType === "single_choice" || qType === "multi_choice") {
      const lines = choicesText.split("\n").map((s) => s.trim()).filter(Boolean);
      const choices = lines.map((text, i) => ({ id: ids(lines.length)[i], text }));
      return qType === "single_choice"
        ? { options: { choices }, answer: { choice: answerText.trim().toLowerCase() } }
        : { options: { choices, select: answerText.split(",").length }, answer: { choices: answerText.split(",").map((s) => s.trim().toLowerCase()) } };
    }
    if (qType === "true_false") return { options: {}, answer: { value: answerText.trim().toLowerCase() === "true" } };
    if (qType === "fill_blank") return { options: { placeholder: choicesText.trim() }, answer: { accept: answerText.split(",").map((s) => s.trim()) } };
    if (qType === "drag_order") {
      const lines = choicesText.split("\n").map((s) => s.trim()).filter(Boolean);
      const items = lines.map((text, i) => ({ id: `i${i + 1}`, text }));
      return { options: { items }, answer: { order: answerText.split(",").map((s) => s.trim()) } };
    }
    // drag_match
    const l = pairsLeft.split("\n").map((s) => s.trim()).filter(Boolean).map((text, i) => ({ id: `l${i + 1}`, text }));
    const r = pairsRight.split("\n").map((s) => s.trim()).filter(Boolean).map((text, i) => ({ id: `r${i + 1}`, text }));
    const pairs: Record<string, string> = {};
    for (const kv of answerText.split(",").map((s) => s.trim()).filter(Boolean)) {
      const [lk, rk] = kv.split(":").map((s) => s.trim());
      pairs[lk] = rk;
    }
    return { options: { left: l, right: r }, answer: { pairs } };
  }

  async function saveQuestion() {
    if (!stem.trim() || !activePool) return;
    setBusy(true);
    try {
      const { options, answer } = build();
      const res = await post("/api/studio/questions", {
        id: drawer?.q?.id, poolId: activePool, type: qType, stemMd: stem, options, answer, explanationMd: explanation, status: qStatus,
      });
      setDrawer(null);
      setToast({ text: res.versioned ? "Question versioned — old copy retired" : "Question saved" });
      router.refresh();
    } catch (e) { setToast({ text: (e as Error).message, err: true }); }
    setBusy(false);
  }

  async function createPool(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await post("/api/studio/pools", { certCode: pCert.trim().toUpperCase(), domainCode: pDomain.trim(), title: pTitle.trim() });
      setActivePool(res.id);
      setPDomain(""); setPTitle("");
      router.refresh();
    } catch (e2) { setToast({ text: (e2 as Error).message, err: true }); }
  }

  async function runImport() {
    setBusy(true);
    try {
      const res = await post("/api/studio/questions/import", { poolId: activePool, csv });
      setToast({ text: `${res.imported} imported as drafts${res.errors.length ? ` · ${res.errors.length} line(s) skipped` : ""}` });
      setCsv(""); setImportOpen(false);
      router.refresh();
    } catch (e) { setToast({ text: (e as Error).message, err: true }); }
    setBusy(false);
  }

  const answerHelp: Record<string, string> = {
    single_choice: "Answer = the letter of the correct choice, e.g. b",
    multi_choice: "Answer = correct letters comma-separated, e.g. a,c",
    true_false: "Answer = true or false",
    fill_blank: "Options box = input placeholder · Answer = accepted answers comma-separated",
    drag_order: "Items get ids i1,i2,… in the order typed. Answer = correct id order, e.g. i2,i1,i3",
    drag_match: "Left/right get ids l1…,r1…. Answer = pairs like l1:r2,l2:r1",
  };

  return (
    <>
      <div className="main-head">
        <h1>Question bank</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn ghost small" onClick={() => setImportOpen(true)} disabled={!activePool}>Import CSV</button>
          <button className="btn small" onClick={() => openQuestion()} disabled={!activePool}>+ Question</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {pools.map((p) => (
          <button key={p.id} className={`btn ghost small${p.id === activePool ? "" : ""}`}
            style={p.id === activePool ? { borderColor: "var(--accent)", color: "var(--accent-bright)" } : {}}
            onClick={() => setActivePool(p.id)}>
            {p.certCode} · {p.domainCode} {p.title}
          </button>
        ))}
      </div>

      <div className="tbl-wrap" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead><tr><th>Stem</th><th>Type</th><th>Status</th><th>p-value</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {visible.map((q) => (
              <tr key={q.id}>
                <td style={{ maxWidth: 420 }}><b>{q.stemMd.slice(0, 110)}{q.stemMd.length > 110 ? "…" : ""}</b></td>
                <td className="mono" style={{ fontSize: "0.75rem" }}>{q.type}</td>
                <td>{q.status === "live" ? <span className="tag ok">live</span> : <span className="tag warn">{q.status}</span>}</td>
                <td className="mono">{q.stats && q.stats.attempts > 0 ? (q.stats.correct / q.stats.attempts).toFixed(2) : "—"}</td>
                <td><button className="btn ghost small" onClick={() => openQuestion(q)}>Edit</button></td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={5} className="mut">No questions in this pool yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={createPool} className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ margin: 0, width: 120 }}>
          <label htmlFor="pc">Cert</label>
          <input id="pc" className="input mono" value={pCert} onChange={(e) => setPCert(e.target.value)} required />
        </div>
        <div className="field" style={{ margin: 0, width: 90 }}>
          <label htmlFor="pd">Domain</label>
          <input id="pd" className="input mono" placeholder="D1" value={pDomain} onChange={(e) => setPDomain(e.target.value)} required />
        </div>
        <div className="field" style={{ margin: 0, flex: "1 1 220px" }}>
          <label htmlFor="pt">Pool title</label>
          <input id="pt" className="input" placeholder="Describe cloud concepts" value={pTitle} onChange={(e) => setPTitle(e.target.value)} required />
        </div>
        <button className="btn ghost">Add pool</button>
      </form>

      {drawer && (
        <>
          <div className="drawer-veil" onClick={() => setDrawer(null)} />
          <div className="drawer" role="dialog" aria-label="Question editor">
            <h2>{drawer.q ? "Edit question" : "New question"}</h2>
            <div className="field">
              <label htmlFor="qt">Type</label>
              <select id="qt" className="input" value={qType} onChange={(e) => setQType(e.target.value as never)} disabled={Boolean(drawer.q)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="qs">Question stem (Markdown)</label>
              <textarea id="qs" className="input" style={{ minHeight: 110 }} value={stem} onChange={(e) => setStem(e.target.value)} />
            </div>
            {(qType === "single_choice" || qType === "multi_choice" || qType === "drag_order") && (
              <div className="field">
                <label htmlFor="qc">{qType === "drag_order" ? "Items — one per line" : "Choices — one per line (auto-lettered a, b, c…)"}</label>
                <textarea id="qc" className="input" style={{ minHeight: 110 }} value={choicesText} onChange={(e) => setChoicesText(e.target.value)} />
              </div>
            )}
            {qType === "fill_blank" && (
              <div className="field">
                <label htmlFor="qp">Input placeholder</label>
                <input id="qp" className="input" value={choicesText} onChange={(e) => setChoicesText(e.target.value)} />
              </div>
            )}
            {qType === "drag_match" && (
              <>
                <div className="field">
                  <label htmlFor="ql">Left column — one per line (ids l1, l2…)</label>
                  <textarea id="ql" className="input" value={pairsLeft} onChange={(e) => setPairsLeft(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="qr">Right column — one per line (ids r1, r2…)</label>
                  <textarea id="qr" className="input" value={pairsRight} onChange={(e) => setPairsRight(e.target.value)} />
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="qa">Answer</label>
              <input id="qa" className="input mono" value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
              <span className="hint">{answerHelp[qType]}</span>
            </div>
            <div className="field">
              <label htmlFor="qe">Explanation (shown after answering / in the report)</label>
              <textarea id="qe" className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="qst">Status</label>
              <select id="qst" className="input" value={qStatus} onChange={(e) => setQStatus(e.target.value)}>
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="live">live</option>
                <option value="retired">retired</option>
              </select>
              <span className="hint">Editing a live question retires the original and creates a fresh version — past attempts keep their history.</span>
            </div>
            <div className="drawer-actions">
              <button className={`btn${busy ? " loading" : ""}`} onClick={saveQuestion} disabled={busy || !stem.trim()}>Save question</button>
              <button className="btn ghost" onClick={() => setDrawer(null)}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {importOpen && (
        <>
          <div className="drawer-veil" onClick={() => setImportOpen(false)} />
          <div className="drawer" role="dialog" aria-label="CSV import">
            <h2>Import questions</h2>
            <p className="mut" style={{ fontSize: "0.85rem" }}>
              One question per line, pipe-separated:<br />
              <code style={{ fontSize: "0.75rem" }}>type|stem|choiceA;choiceB;choiceC|answer|explanation</code><br />
              Types: single_choice (answer = letter), multi_choice (a,c), true_false (true/false), fill_blank (choices column = placeholder, answer = accepted,values). Imports land as <b>drafts</b> for review.
            </p>
            <div className="field">
              <label htmlFor="ic">CSV lines</label>
              <textarea id="ic" className="input mono" style={{ minHeight: 220, fontSize: "0.8rem" }} value={csv} onChange={(e) => setCsv(e.target.value)} />
            </div>
            <div className="drawer-actions">
              <button className={`btn${busy ? " loading" : ""}`} onClick={runImport} disabled={busy || !csv.trim()}>Import into this pool</button>
              <button className="btn ghost" onClick={() => setImportOpen(false)}>Cancel</button>
            </div>
          </div>
        </>
      )}
      {toast && <div className={`toast${toast.err ? " err" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}
