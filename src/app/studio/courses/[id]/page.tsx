import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { db, schema } from "@/db";
import { asc, eq, inArray } from "drizzle-orm";
import CurriculumEditor from "@/components/studio/CurriculumEditor";

export const dynamic = "force-dynamic";

export default async function StudioCourse({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "instructor");
  const { id } = await params;
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, id) });
  if (!course) notFound();
  const mods = await db.query.modules.findMany({ where: eq(schema.modules.courseId, id), orderBy: [asc(schema.modules.position)] });
  const modIds = mods.map((m) => m.id);
  const lessons = modIds.length
    ? await db.query.lessons.findMany({ where: inArray(schema.lessons.moduleId, modIds), orderBy: [asc(schema.lessons.position)] })
    : [];
  const modules = mods.map((m) => ({ id: m.id, title: m.title, lessons: lessons.filter((l) => l.moduleId === m.id).map((l) => ({ id: l.id, title: l.title, kind: l.kind, content: l.content as Record<string, unknown>, moduleId: l.moduleId })) }));
  return <CurriculumEditor course={{ id: course.id, title: course.title, status: course.status, slug: course.slug }} modules={modules as never} />;
}
