import Link from "next/link";
import { notFound } from "next/navigation";
import PublicNav from "@/components/PublicNav";
import { courseBySlug, hasAccess } from "@/services/courses";
import { getSession } from "@/lib/session";
import { md } from "@/lib/md";

export const dynamic = "force-dynamic";

export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await courseBySlug(slug);
  if (!data || data.course.status !== "published") notFound();
  const session = await getSession();
  const enrolled = session ? await hasAccess(session.user.id, data.course.id) : false;
  const lessonCount = data.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <>
      <PublicNav />
      <main className="section">
        <div className="shell split">
          <div>
            <span className="code" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-bright)", letterSpacing: "0.1em" }}>{data.course.certCode}</span>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", marginTop: 8 }}>{data.course.title}</h1>
            <p className="lede mut">{data.course.subtitle}</p>
            <div className="hero-cta">
              {enrolled ? (
                <Link className="btn" href={`/learn/${data.course.slug}`}>Continue learning</Link>
              ) : session ? (
                <Link className="btn" href={`/learn?redeem=1`}>Redeem an access code</Link>
              ) : (
                <Link className="btn" href={`/auth/sign-up?next=/courses/${data.course.slug}`}>Create account</Link>
              )}
              <span className="tag">{lessonCount} lessons · {data.modules.length} modules</span>
            </div>
            <div className="prose" style={{ marginTop: 32 }} dangerouslySetInnerHTML={{ __html: md(data.course.descriptionMd) }} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem" }}>Curriculum</h2>
            <div className="curric">
              {data.modules.map((m, i) => (
                <div className="mod" key={m.id}>
                  <div className="mt"><h3>{String(i + 1).padStart(2, "0")} · {m.title}</h3><span className="faint mono" style={{ fontSize: "0.78rem" }}>{m.lessons.length} lessons</span></div>
                  {m.lessons.map((l) => (
                    <div className="lesson-row" key={l.id}>
                      <span className="kind">{l.kind}</span>
                      <span className="name">{l.title}</span>
                      {l.isFreePreview && <span className="tick" style={{ color: "var(--accent-bright)" }}>preview</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
