import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import { publicCatalog } from "@/services/courses";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

export default async function Courses() {
  const catalog = await publicCatalog();
  return (
    <>
      <PublicNav />
      <main className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <p className="k">Catalog</p>
              <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)" }}>Courses</h1>
            </div>
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
          </div>
        </div>
      </main>
    </>
  );
}
