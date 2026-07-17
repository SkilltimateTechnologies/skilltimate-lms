"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Q = {
  position: number;
  questionId: string;
  type: string;
  stemMd: string;
  options: any;
  response: any;
  isFlagged: boolean;
};
type State = {
  attempt: { id: string; status: string; startedAt: number; deadlineAt: number; serverNow: number };
  exam: { id: string; title: string; certCode: string; mode: string; durationMinutes: number; passScaled: number; total: number };
  questions: Q[];
};
type Feedback = { correct: boolean; answer: any; explanationMd: string };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h > 0 ? `${h}:` : "") + `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function plain(md: string) {
  return md.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\n+/g, " ").trim();
}

/** minimal md → text for stems (bold + code + line breaks) */
function Stem({ md }: { md: string }) {
  const html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
  return <div className="stem" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ExamRunner({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const clockOffset = useRef(0);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const autoFired = useRef(false);

  /* ── load ── */
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/attempts/${attemptId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not load the attempt"); return; }
      const s: State = data;
      if (s.attempt.status !== "in_progress") { router.replace(`/learn/results/${attemptId}`); return; }
      clockOffset.current = s.attempt.serverNow - Date.now();
      const r: Record<string, any> = {};
      const f: Record<string, boolean> = {};
      for (const q of s.questions) { if (q.response) r[q.questionId] = q.response; f[q.questionId] = q.isFlagged; }
      setResponses(r); setFlags(f); setState(s);
      const firstUnanswered = s.questions.findIndex((q) => !q.response);
      setIdx(firstUnanswered === -1 ? 0 : firstUnanswered);
    })();
  }, [attemptId, router]);

  /* ── clock ── */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const remaining = state ? state.attempt.deadlineAt - (now + clockOffset.current) : Infinity;

  const doSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
    router.replace(`/learn/results/${attemptId}`);
  }, [attemptId, router, submitting]);

  /* ── auto-submit at time-up (simulation) ── */
  useEffect(() => {
    if (state && state.exam.mode === "simulation" && remaining <= 0 && !autoFired.current) {
      autoFired.current = true;
      doSubmit();
    }
  }, [remaining, state, doSubmit]);

  /* ── autosave (≤2s debounce per question) ── */
  const save = useCallback(
    (questionId: string, response: any) => {
      setResponses((prev) => ({ ...prev, [questionId]: response }));
      clearTimeout(saveTimers.current[questionId]);
      saveTimers.current[questionId] = setTimeout(async () => {
        setSaving(true);
        const res = await fetch(`/api/attempts/${attemptId}/answer`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, response }),
        });
        setSaving(false);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 409) { setToast({ text: "Time is up — submitting your paper.", err: true }); doSubmit(); }
          else setToast({ text: data.error || "Save failed — check your connection", err: true });
        }
      }, 700);
    },
    [attemptId, doSubmit]
  );

  async function flip(questionId: string) {
    const nextVal = !flags[questionId];
    setFlags((p) => ({ ...p, [questionId]: nextVal }));
    await fetch(`/api/attempts/${attemptId}/flag`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, flagged: nextVal }),
    });
  }

  async function check(q: Q) {
    const response = responses[q.questionId];
    if (!response) return;
    const res = await fetch(`/api/attempts/${attemptId}/check`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.questionId, response }),
    });
    const data = await res.json();
    if (res.ok) setFeedback((p) => ({ ...p, [q.questionId]: data }));
  }

  const answered = useMemo(
    () => (state ? state.questions.filter((q) => responses[q.questionId] != null).length : 0),
    [state, responses]
  );

  if (error)
    return (
      <main className="auth-wrap"><div className="auth-card"><h1 style={{ fontSize: "1.3rem" }}>Can't open this attempt</h1><p className="mut">{error}</p><a className="btn" href="/learn/exams">Back to exams</a></div></main>
    );
  if (!state)
    return (
      <main className="auth-wrap"><p className="mut" role="status">Preparing your paper…</p></main>
    );

  const q = state.questions[idx];
  const fb = feedback[q.questionId];
  const isPractice = state.exam.mode === "practice";
  const resp = responses[q.questionId];

  /* ── per-type renderers ── */
  function renderQuestion() {
    switch (q.type) {
      case "single_choice":
        return (q.options.choices as { id: string; text: string }[]).map((c) => {
          const sel = resp?.choice === c.id;
          let cls = "opt";
          if (fb) {
            if (fb.answer.choice === c.id) cls += " correct";
            else if (sel) cls += " wrong";
          } else if (sel) cls += " sel";
          return (
            <button key={c.id} className={cls} disabled={Boolean(fb)} onClick={() => save(q.questionId, { choice: c.id })}>
              <span className="key">{c.id.toUpperCase()}</span><span>{c.text}</span>
            </button>
          );
        });
      case "multi_choice": {
        const chosen: string[] = resp?.choices ?? [];
        return (
          <>
            <p className="faint" style={{ marginTop: -12 }}>Select {q.options.select ?? "all that apply"}.</p>
            {(q.options.choices as { id: string; text: string }[]).map((c) => {
              const sel = chosen.includes(c.id);
              let cls = "opt";
              if (fb) {
                if ((fb.answer.choices as string[]).includes(c.id)) cls += " correct";
                else if (sel) cls += " wrong";
              } else if (sel) cls += " sel";
              return (
                <button key={c.id} className={cls} disabled={Boolean(fb)}
                  onClick={() => {
                    const next = sel ? chosen.filter((x) => x !== c.id) : [...chosen, c.id];
                    save(q.questionId, { choices: next });
                  }}>
                  <span className="key">{sel ? "✓" : c.id.toUpperCase()}</span><span>{c.text}</span>
                </button>
              );
            })}
          </>
        );
      }
      case "true_false":
        return (["True", "False"] as const).map((label) => {
          const val = label === "True";
          const sel = resp?.value === val;
          let cls = "opt";
          if (fb) {
            if (fb.answer.value === val) cls += " correct";
            else if (sel) cls += " wrong";
          } else if (sel) cls += " sel";
          return (
            <button key={label} className={cls} disabled={Boolean(fb)} onClick={() => save(q.questionId, { value: val })}>
              <span className="key">{label === "True" ? "T" : "F"}</span><span>{label}</span>
            </button>
          );
        });
      case "drag_order": {
        const items = q.options.items as { id: string; text: string }[];
        const order: string[] = resp?.order ?? items.map((i) => i.id);
        const byId = new Map(items.map((i) => [i.id, i]));
        function move(from: number, dir: -1 | 1) {
          const next = [...order];
          const to = from + dir;
          if (to < 0 || to >= next.length) return;
          [next[from], next[to]] = [next[to], next[from]];
          save(q.questionId, { order: next });
        }
        return (
          <>
            <p className="faint" style={{ marginTop: -12 }}>Arrange into the correct order (top = first).</p>
            {order.map((id, i) => (
              <div className="order-item" key={id}>
                <span className="key mono" style={{ color: "var(--ink-faint)", fontSize: "0.8rem" }}>{i + 1}</span>
                <span className="txt">{byId.get(id)?.text}</span>
                <span className="mv">
                  <button className="mvbtn" aria-label="Move up" disabled={i === 0 || Boolean(fb)} onClick={() => move(i, -1)}>↑</button>
                  <button className="mvbtn" aria-label="Move down" disabled={i === order.length - 1 || Boolean(fb)} onClick={() => move(i, 1)}>↓</button>
                </span>
              </div>
            ))}
            {fb && (
              <p className="mut" style={{ fontSize: "0.88rem" }}>
                Correct order: {(fb.answer.order as string[]).map((id, n) => `${n + 1}. ${byId.get(id)?.text}`).join(" → ")}
              </p>
            )}
          </>
        );
      }
      case "drag_match": {
        const left = q.options.left as { id: string; text: string }[];
        const right = q.options.right as { id: string; text: string }[];
        const pairs: Record<string, string> = resp?.pairs ?? {};
        return (
          <>
            <p className="faint" style={{ marginTop: -12 }}>Match each item on the left to its answer.</p>
            {left.map((l) => (
              <div className="match-row" key={l.id}>
                <div className="lft">{l.text}</div>
                <select
                  className="input" value={pairs[l.id] ?? ""} disabled={Boolean(fb)}
                  onChange={(e) => save(q.questionId, { pairs: { ...pairs, [l.id]: e.target.value } })}
                  aria-label={`Match for: ${l.text}`}
                >
                  <option value="" disabled>Choose…</option>
                  {right.map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
                </select>
              </div>
            ))}
            {fb && (
              <p className="mut" style={{ fontSize: "0.88rem" }}>
                Correct: {left.map((l) => `${l.text} → ${right.find((r) => r.id === (fb.answer.pairs as any)[l.id])?.text}`).join(" · ")}
              </p>
            )}
          </>
        );
      }
      case "fill_blank":
        return (
          <>
            <input
              className="input" style={{ maxWidth: 420, fontFamily: "var(--font-mono)" }}
              placeholder={q.options.placeholder || "Type your answer"}
              value={resp?.text ?? ""} disabled={Boolean(fb)}
              onChange={(e) => save(q.questionId, { text: e.target.value })}
              aria-label="Your answer"
            />
            {fb && <p className="mut" style={{ fontSize: "0.88rem", marginTop: 12 }}>Accepted: {(fb.answer.accept as string[]).join(", ")}</p>}
          </>
        );
      default:
        return <p className="mut">This question type isn't supported by your app version — skip it and tell your instructor.</p>;
    }
  }

  return (
    <div className="runner">
      <div className="runner-top">
        <span className="ex">{state.exam.title}</span>
        <span className="qpos">Question {idx + 1} of {state.exam.total}</span>
        {saving && <span className="faint" style={{ fontSize: "0.78rem" }} role="status">saving…</span>}
        {state.exam.mode === "simulation" ? (
          <span className={`timer${remaining < 5 * 60_000 ? " low" : ""}`} role="timer" aria-label="Time remaining">{fmt(remaining)}</span>
        ) : (
          <span className="timer" style={{ marginLeft: "auto" }}>practice</span>
        )}
        <div className="rtrack" aria-label={`${answered} of ${state.exam.total} answered`}>
          {state.questions.map((qq, i) => {
            let cls = "";
            if (responses[qq.questionId] != null) cls = "a";
            if (flags[qq.questionId]) cls += " f";
            if (i === idx) cls += " c";
            return <i key={qq.questionId} className={cls.trim()} />;
          })}
        </div>
      </div>

      <div className="runner-body">
        <Stem md={q.stemMd} />
        {renderQuestion()}

        {isPractice && !fb && (
          <button className="btn ghost small" style={{ marginTop: 16 }} disabled={resp == null} onClick={() => check(q)}>
            Check answer
          </button>
        )}
        {fb && (
          <div className={`feedback ${fb.correct ? "good" : "bad"}`}>
            <p className="v">{fb.correct ? "Correct" : "Not quite"}</p>
            <Stem md={fb.explanationMd || ""} />
          </div>
        )}

      </div>

      <div className="runner-foot">
        <div className="runner-foot-in">
          <button className="btn ghost small" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setConfirmSubmit(false); window.scrollTo({ top: 0 }); }}>← Back</button>
          <button className={`flagbtn${flags[q.questionId] ? " on" : ""}`} onClick={() => flip(q.questionId)}>
            {flags[q.questionId] ? "⚑ Flagged" : "⚑ Flag"}
          </button>
          <button className="btn ghost small" onClick={() => setReview(true)}>Review</button>
          <span style={{ flex: 1 }} />
          {idx < state.exam.total - 1 ? (
            <button className="btn small" onClick={() => { setIdx(idx + 1); window.scrollTo({ top: 0 }); }}>Next →</button>
          ) : confirmSubmit ? (
            <>
              <span className="mut" style={{ fontSize: "0.85rem" }}>
                {answered < state.exam.total ? `${state.exam.total - answered} unanswered — submit anyway?` : "Submit your paper?"}
              </span>
              <button className={`btn small${submitting ? " loading" : ""}`} onClick={doSubmit} disabled={submitting}>Yes, submit</button>
              <button className="btn ghost small" onClick={() => setConfirmSubmit(false)} disabled={submitting}>Keep working</button>
            </>
          ) : (
            <button className="btn small" onClick={() => setConfirmSubmit(true)}>Submit exam</button>
          )}
        </div>
      </div>

      {review && (
        <>
          <div className="drawer-veil" onClick={() => setReview(false)} />
          <aside className="drawer" role="dialog" aria-label="Review questions">
            <h2>Review</h2>
            <div className="qsum">
              <span><b>{answered}</b> answered</span>
              <span><b>{state.exam.total - answered}</b> remaining</span>
              <span><b>{state.questions.filter((qq) => flags[qq.questionId]).length}</b> flagged</span>
            </div>
            <div className="qlist">
              {state.questions.map((qq, i) => (
                <button
                  key={qq.questionId}
                  className={`qrow${i === idx ? " current" : ""}`}
                  onClick={() => { setIdx(i); setReview(false); setConfirmSubmit(false); window.scrollTo({ top: 0 }); }}
                >
                  <span className="qn">Q{i + 1}</span>
                  <span className="qs">{plain(qq.stemMd)}</span>
                  {flags[qq.questionId] && <span className="fl">⚑</span>}
                  <span className={`st${responses[qq.questionId] != null ? " a" : ""}`} aria-label={responses[qq.questionId] != null ? "answered" : "unanswered"} />
                </button>
              ))}
            </div>
            <p className="faint" style={{ fontSize: "0.8rem", marginTop: 16 }}>Submitting is on the last question — jump there when you&apos;re ready.</p>
            <div className="drawer-actions">
              <button className="btn ghost small" onClick={() => setReview(false)}>Close</button>
              <button className="btn small" onClick={() => { setIdx(state.exam.total - 1); setReview(false); window.scrollTo({ top: 0 }); }}>Go to last question</button>
            </div>
          </aside>
        </>
      )}

      {toast && <div className={`toast${toast.err ? " err" : ""}`} role="status" onAnimationEnd={() => setToast(null)}>{toast.text}</div>}
    </div>
  );
}
