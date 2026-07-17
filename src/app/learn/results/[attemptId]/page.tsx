import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getResult } from "@/services/exams";
import { md } from "@/lib/md";

export const dynamic = "force-dynamic";
export const metadata = { title: "Score report" };

function AnswerText({ type, options, value }: { type: string; options: any; value: any }) {
  if (value == null) return <span className="faint">— unanswered</span>;
  const choiceText = (id: string) => (options.choices as { id: string; text: string }[])?.find((c) => c.id === id)?.text ?? id;
  switch (type) {
    case "single_choice": return <span>{choiceText(value.choice)}</span>;
    case "multi_choice": return <span>{(value.choices as string[]).map(choiceText).join(" · ")}</span>;
    case "true_false": return <span>{value.value ? "True" : "False"}</span>;
    case "fill_blank": return <span className="mono">{value.text || value.accept?.join(", ")}</span>;
    case "drag_order": {
      const byId = new Map((options.items as { id: string; text: string }[]).map((i) => [i.id, i.text]));
      return <span>{(value.order as string[]).map((id) => byId.get(id)).join(" → ")}</span>;
    }
    case "drag_match": {
      const left = new Map((options.left as { id: string; text: string }[]).map((i) => [i.id, i.text]));
      const right = new Map((options.right as { id: string; text: string }[]).map((i) => [i.id, i.text]));
      return <span>{Object.entries(value.pairs as Record<string, string>).map(([l, r]) => `${left.get(l)} → ${right.get(r)}`).join(" · ")}</span>;
    }
    default: return <span className="mono">{JSON.stringify(value)}</span>;
  }
}

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await requireUser();
  const { attempt, exam, review, trend } = await getResult(session.user, attemptId);
  const pass = Boolean(attempt.passed);
  const correct = review.filter((r) => r.isCorrect).length;

  return (
    <>
      <div className="main-head">
        <div>
          <p className="faint" style={{ margin: 0, fontSize: "0.8rem" }}><Link href="/learn/exams" className="mut">Mock exams</Link> · {exam.certCode}</p>
          <h1 style={{ marginTop: 4 }}>{exam.title}</h1>
        </div>
      </div>

      <div className={`verdict ${pass ? "pass" : "fail"}`}>
        <div>
          <span className="scaled">{attempt.scaledScore}</span>
          <span className="mut mono">/1000</span>
        </div>
        <div style={{ minWidth: 0 }}>
          {pass ? <span className="tag ok">PASS · at or above {exam.passScaled}</span> : <span className="tag danger">BELOW {exam.passScaled}</span>}
          <p className="mut" style={{ margin: "8px 0 0", fontSize: "0.9rem" }}>
            {correct} of {review.length} correct · {attempt.status === "auto_submitted" ? "auto-submitted when time ended" : "submitted"} ·{" "}
            {new Date(attempt.submittedAt ?? attempt.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        {trend.length > 1 && (
          <div style={{ marginLeft: "auto", minWidth: "min(260px, 100%)" }}>
            <p className="faint" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Score trend — this exam</p>
            <div className="trend">
              {trend.map((t, i) => (
                <div key={t.id} className={`bar${i === trend.length - 1 ? " latest" : ""}`} style={{ height: `${Math.max(6, (t.scaled / 1000) * 100)}%` }}>
                  <span>{t.scaled}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {attempt.domainScores && attempt.domainScores.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Performance by domain</h3>
          {attempt.domainScores.map((d) => {
            const pct = d.total ? Math.round((100 * d.correct) / d.total) : 0;
            return (
              <div className={`dbar${pct < 60 ? " low" : ""}`} key={d.domainCode}>
                <div className="dl"><span>{d.title}</span><b>{d.correct}/{d.total}</b></div>
                <div className="track"><i className="fill" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          <p className="faint" style={{ margin: 0, fontSize: "0.8rem" }}>Domains under 60% are highlighted — revise those modules before your next sitting.</p>
        </div>
      )}

      <h2 style={{ fontSize: "1.25rem" }}>Full review</h2>
      {review.map((r) => (
        <div className="rev" key={r.position}>
          <div className="rh">
            <span className="n mono">Q{r.position + 1}</span>
            {r.isCorrect ? <span className="tag ok">correct</span> : <span className="tag danger">{r.response == null ? "unanswered" : "incorrect"}</span>}
            <span className="faint mono" style={{ fontSize: "0.72rem" }}>{r.type.replace("_", " ")}</span>
          </div>
          <div className="stem" style={{ fontSize: "0.98rem" }} dangerouslySetInnerHTML={{ __html: md(r.stemMd) }} />
          <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
            <span className="faint">Your answer · </span>
            <AnswerText type={r.type} options={r.options} value={r.response} />
          </p>
          {!r.isCorrect && (
            <p style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>
              <span className="faint">Correct answer · </span>
              <span style={{ color: "var(--ok)" }}><AnswerText type={r.type} options={r.options} value={r.answer} /></span>
            </p>
          )}
          {r.explanationMd && (
            <div className="mut" style={{ fontSize: "0.9rem", borderTop: "1px solid var(--line-soft)", paddingTop: 10, marginTop: 10 }}
              dangerouslySetInnerHTML={{ __html: md(r.explanationMd) }} />
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link href="/learn/exams" className="btn">Take another mock</Link>
        <Link href="/learn" className="btn ghost">Dashboard</Link>
      </div>
    </>
  );
}
