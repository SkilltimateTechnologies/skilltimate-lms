import Link from "next/link";
import { requireRole } from "@/lib/session";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import NewCourse from "@/components/studio/NewCourse";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses · Studio" };

export default async function StudioCourses() {
  await requireRole("admin", "instructor");
  const courses = await db.query.courses.findMany({ orderBy: [asc(schema.courses.position)] });
  return (
    <>
      <div className="main-head"><h1>Courses</h1></div>
      <div className="panel-grid" style={{ marginBottom: 24 }}>
        {courses.map((c) => (
          <Link key={c.id} href={`/studio/courses/${c.id}`} className="course-card">
            <span className="code">{c.certCode}</span>
            <h3>{c.title}</h3>
            <span className="meta">
              {c.status === "published" ? <span className="tag ok">published</span> : <span className="tag warn">{c.status}</span>}
              <span>/{c.slug}</span>
            </span>
          </Link>
        ))}
      </div>
      <NewCourse />
    </>
  );
}
