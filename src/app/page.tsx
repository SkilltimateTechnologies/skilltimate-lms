import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import { platformStats, publicCatalog } from "@/services/courses";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, catalog] = await Promise.all([platformStats(), publicCatalog()]);
  return (
    <>
      <PublicNav />
      <main>
        <section className="hero">
          <div className="shell">
            <p className="tag">Microsoft Fundamentals · exam-first training</p>
            <h1>
              Walk into the real exam
              <br />
              already knowing how it ends.
            </h1>
            <p className="lede">
              Structured courses for AB-900, AI-900, AZ-900 and DP-900 — paired with full-length
              mock exams that behave like Pearson VUE: a hard 45-minute clock, scaled scoring to
              1000, and a per-domain score report after every sitting.
            </p>
            <div className="hero-cta">
              <Link href="/auth/sign-up" className="btn">Start preparing</Link>
              <Link href="/courses" className="btn ghost">Browse courses</Link>
            </div>
          </div>
        </section>

        {/* Stat-Led: every number below is computed live from the database. */}
        <section className="statbar" aria-label="Platform numbers">
          <div className="shell statbar-in">
            <div className="stat"><span className="n">{stats.courses}</span><span className="l">Courses live</span></div>
            <div className="stat"><span className="n">{stats.questions}</span><span className="l">Bank questions</span></div>
            <div className="stat"><span className="n">{stats.exams}</span><span className="l">Mock exams</span></div>
            <div className="stat"><span className="n">{stats.attempts}</span><span className="l">Attempts scored</span></div>
          </div>
        </section>

        <section className="section">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="k">Catalog</p>
                <h2>Four certifications. One method.</h2>
              </div>
              <Link href="/courses" className="mut">All courses →</Link>
            </div>
            <div className="course-grid">
              {catalog.map((c) => (
                <Link key={c.id} href={`/courses/${c.slug}`} className="course-card">
                  <span className="code">{c.certCode}</span>
                  <h3>{c.title}</h3>
                  <p className="sub">{c.subtitle}</p>
                  <span className="meta"><span className="tag">{c.level}</span><span>{c.language}</span></span>
                </Link>
              ))}
              {catalog.length === 0 && <p className="mut">Courses are being prepared — check back shortly.</p>}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="shell split">
            <div>
              <p className="k" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-bright)", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: "0.75rem" }}>The exam engine</p>
              <h2>Mocks that rehearse the real thing — not a quiz widget.</h2>
              <ul className="checklist">
                <li><span><strong>Server-side 45-minute clock.</strong> When time ends, the paper submits itself with whatever you've answered — exactly like the exam hall.</span></li>
                <li><span><strong>Scaled scoring to 1000, pass at 700.</strong> Your report shows the same domain bars Microsoft prints, so you know precisely where you stand.</span></li>
                <li><span><strong>A fresh paper every sitting.</strong> Questions are drawn from domain pools and shuffled per attempt — retakes rehearse, they don't memorise.</span></li>
                <li><span><strong>Crash-proof.</strong> Every answer autosaves. Power cut, tab closed, phone died — resume mid-question with the clock exactly where it was.</span></li>
                <li><span><strong>No surveillance.</strong> No webcam, no lockdown browser. You're preparing yourself — the score trend keeps you honest.</span></li>
              </ul>
            </div>
            <div className="mock-report" aria-hidden="true">
              <div className="rt">
                <span className="tag ok">PASS</span>
                <span className="score-big mono">812<span className="faint" style={{ fontSize: "1rem" }}>/1000</span></span>
              </div>
              <div className="dbar">
                <div className="dl"><span>Describe cloud concepts</span><b>10/12</b></div>
                <div className="track"><i className="fill" style={{ width: "83%" }} /></div>
              </div>
              <div className="dbar">
                <div className="dl"><span>Azure architecture &amp; services</span><b>8/10</b></div>
                <div className="track"><i className="fill" style={{ width: "80%" }} /></div>
              </div>
              <div className="dbar">
                <div className="dl"><span>Management &amp; governance</span><b>5/6</b></div>
                <div className="track"><i className="fill" style={{ width: "83%" }} /></div>
              </div>
              <p className="faint" style={{ fontSize: "0.78rem", margin: 0 }}>Illustrative report layout — your numbers come from your attempts.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="shell footer-in">
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 600 }}>
            Preparation is a rehearsal, not a gamble.
          </p>
          <p className="fine">© {new Date().getFullYear()} Skilltimate Technologies · learn.skilltimate.com</p>
        </div>
      </footer>
    </>
  );
}
