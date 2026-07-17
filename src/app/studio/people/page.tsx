import { requireRole } from "@/lib/session";
import { listPeople } from "@/services/studio";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import PeopleManager from "@/components/studio/PeopleManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "People · Studio" };

export default async function PeoplePage() {
  const session = await requireRole("admin", "instructor");
  const { users, grants, batches, members } = await listPeople(session.user);
  const courses = await db.query.courses.findMany({ orderBy: [asc(schema.courses.position)] });
  return (
    <PeopleManager
      users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })) as never}
      batches={batches as never}
      courses={courses.map((c) => ({ id: c.id, title: c.title, certCode: c.certCode })) as never}
      grants={grants.map((g) => ({ userId: g.userId, courseId: g.courseId })) as never}
      members={members.map((m) => ({ batchId: m.batchId, userId: m.userId })) as never}
    />
  );
}
