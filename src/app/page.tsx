import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { platformStats } from "@/services/courses";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Skilltimate Learn — Sign in" };
export const dynamic = "force-dynamic";

export default async function Gateway() {
  let stats;
  try {
    const session = await getSession();
    if (session) {
      const role = session.user.role;
      redirect(role === "admin" || role === "instructor" ? "/studio" : "/learn");
    }
    stats = await platformStats();
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    // Database not initialized yet (fresh deploy) — show setup instructions
    return (
      <main className="gate-auth" style={{ minHeight: "100dvh" }}>
        <div className="auth-card">
          <span className="brand" style={{ marginBottom: 20, display: "inline-flex" }}>Skilltimate<span className="dot">·</span>Learn</span>
          <h1 style={{ fontSize: "1.3rem" }}>One step left</h1>
          <p className="mut">This instance is deployed but its database hasn&apos;t been initialized. Open this URL once, replacing the key with your <code className="mono">BETTER_AUTH_SECRET</code> value:</p>
          <p className="mono" style={{ fontSize: "0.8rem", wordBreak: "break-all", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "0.7rem" }}>/api/setup?key=YOUR_SECRET</p>
          <p className="mut" style={{ fontSize: "0.85rem" }}>It creates the tables and seeds the starter content, then this page becomes the sign-in.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="gate">
      <section className="gate-brand" aria-hidden="true">
        <div className="gate-glow" />
        <div className="gate-brand-in">
          <span className="brand" style={{ fontSize: "1.15rem" }}>
            Skilltimate<span className="dot">·</span>Learn
          </span>
          <h1 className="gate-h">
            Rehearse the exam<br />before it counts.
          </h1>
          <p className="gate-p">
            Timed mock exams and structured prep for Microsoft fundamentals certifications
            — built and graded the way the real paper is.
          </p>
          <ul className="gate-certs">
            <li>AB-900</li>
            <li>AI-900</li>
            <li>AZ-900</li>
            <li>DP-900</li>
          </ul>
          <div className="gate-stats">
            <div><b className="mono">{stats.questions}</b><span>live questions</span></div>
            <div><b className="mono">{stats.exams}</b><span>mock exams</span></div>
            <div><b className="mono">{stats.courses}</b><span>courses</span></div>
          </div>
        </div>
      </section>

      <section className="gate-auth">
        <div className="auth-card">
          <span className="brand gate-mobile-brand">Skilltimate<span className="dot">·</span>Learn</span>
          <h2 style={{ fontSize: "1.45rem", marginBottom: 4 }}>Welcome</h2>
          <p className="mut" style={{ marginTop: 0 }}>Sign in to continue. Your role decides where you land — students go to learning, staff to Studio.</p>
          <Suspense><AuthForm mode="sign-in" /></Suspense>
          <p className="mut" style={{ marginTop: 20, fontSize: "0.88rem" }}>
            Have an invite from your college or team? <Link href="/auth/sign-up">Create your account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
