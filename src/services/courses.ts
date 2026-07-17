import { db, schema } from "@/db";
import { and, asc, eq, inArray, count } from "drizzle-orm";
import { AuthError } from "@/lib/session";
import { randomUUID } from "crypto";

type SessionUser = { id: string; role?: string | null };

export async function publicCatalog() {
  const list = await db.query.courses.findMany({
    where: eq(schema.courses.status, "published"),
    orderBy: [asc(schema.courses.position)],
  });
  return list;
}

/** Honest, database-computed stats for the Stat-Led home (Hallmark gate 46). */
export async function platformStats() {
  const [c] = await db.select({ n: count() }).from(schema.courses).where(eq(schema.courses.status, "published"));
  const [q] = await db.select({ n: count() }).from(schema.questions).where(eq(schema.questions.status, "live"));
  const [e] = await db.select({ n: count() }).from(schema.exams).where(eq(schema.exams.status, "published"));
  const [a] = await db.select({ n: count() }).from(schema.examAttempts);
  return { courses: c.n, questions: q.n, exams: e.n, attempts: a.n };
}

export async function courseBySlug(slug: string) {
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.slug, slug) });
  if (!course) return null;
  const mods = await db.query.modules.findMany({
    where: eq(schema.modules.courseId, course.id),
    orderBy: [asc(schema.modules.position)],
  });
  const modIds = mods.map((m) => m.id);
  const ls = modIds.length
    ? await db.query.lessons.findMany({
        where: inArray(schema.lessons.moduleId, modIds),
        orderBy: [asc(schema.lessons.position)],
      })
    : [];
  return {
    course,
    modules: mods.map((m) => ({ ...m, lessons: ls.filter((l) => l.moduleId === m.id) })),
  };
}

export async function hasAccess(userId: string, courseId: string) {
  const g = await db.query.accessGrants.findFirst({
    where: and(eq(schema.accessGrants.userId, userId), eq(schema.accessGrants.courseId, courseId)),
  });
  if (!g) return false;
  if (g.expiresAt && g.expiresAt < Date.now()) return false;
  return true;
}

export async function requireAccess(user: SessionUser, courseId: string) {
  if (user.role === "admin" || user.role === "instructor") return;
  if (!(await hasAccess(user.id, courseId))) throw new AuthError("You don't have access to this course", 403);
}

export async function myCourses(user: SessionUser) {
  const grants = await db.query.accessGrants.findMany({ where: eq(schema.accessGrants.userId, user.id) });
  const ids = grants.filter((g) => !g.expiresAt || g.expiresAt > Date.now()).map((g) => g.courseId);
  const all = await db.query.courses.findMany({
    where: eq(schema.courses.status, "published"),
    orderBy: [asc(schema.courses.position)],
  });
  const visible = user.role === "admin" || user.role === "instructor" ? all : all.filter((c) => ids.includes(c.id));
  // progress per course
  const result = [];
  for (const c of visible) {
    const mods = await db.query.modules.findMany({ where: eq(schema.modules.courseId, c.id) });
    const modIds = mods.map((m) => m.id);
    const ls = modIds.length
      ? await db.query.lessons.findMany({ where: inArray(schema.lessons.moduleId, modIds) })
      : [];
    const lids = ls.map((l) => l.id);
    const done = lids.length
      ? await db.query.lessonProgress.findMany({
          where: and(
            eq(schema.lessonProgress.userId, user.id),
            inArray(schema.lessonProgress.lessonId, lids),
            eq(schema.lessonProgress.status, "completed")
          ),
        })
      : [];
    result.push({ course: c, totalLessons: ls.length, completed: done.length });
  }
  return result;
}

export async function markProgress(user: SessionUser, lessonId: string, status: "started" | "completed", position = 0) {
  const lesson = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, lessonId) });
  if (!lesson) throw new AuthError("Lesson not found", 404);
  const mod = (await db.query.modules.findFirst({ where: eq(schema.modules.id, lesson.moduleId) }))!;
  await requireAccess(user, mod.courseId);
  const existing = await db.query.lessonProgress.findFirst({
    where: and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.lessonId, lessonId)),
  });
  if (existing) {
    // completion is sticky — never regress
    const nextStatus = existing.status === "completed" ? "completed" : status;
    await db
      .update(schema.lessonProgress)
      .set({
        status: nextStatus,
        position: Math.max(existing.position, position),
        completedAt: nextStatus === "completed" ? (existing.completedAt ?? Date.now()) : null,
      })
      .where(eq(schema.lessonProgress.id, existing.id));
  } else {
    await db.insert(schema.lessonProgress).values({
      id: randomUUID(),
      userId: user.id,
      lessonId,
      status,
      position,
      completedAt: status === "completed" ? Date.now() : null,
    });
  }
  return { ok: true };
}

export async function progressMap(userId: string, lessonIds: string[]) {
  if (!lessonIds.length) return new Map<string, { status: string; position: number }>();
  const rows = await db.query.lessonProgress.findMany({
    where: and(eq(schema.lessonProgress.userId, userId), inArray(schema.lessonProgress.lessonId, lessonIds)),
  });
  return new Map(rows.map((r) => [r.lessonId, { status: r.status, position: r.position }]));
}

export async function redeemInvite(user: SessionUser, code: string) {
  const invite = await db.query.inviteCodes.findFirst({
    where: eq(schema.inviteCodes.code, code.trim().toUpperCase()),
  });
  if (!invite) throw new AuthError("Invalid code", 404);
  if (invite.expiresAt && invite.expiresAt < Date.now()) throw new AuthError("Code expired", 410);
  if (invite.usedCount >= invite.maxUses) throw new AuthError("Code fully redeemed", 410);
  let granted = 0;
  for (const courseId of invite.courseIds) {
    const existing = await db.query.accessGrants.findFirst({
      where: and(eq(schema.accessGrants.userId, user.id), eq(schema.accessGrants.courseId, courseId)),
    });
    if (!existing) {
      await db.insert(schema.accessGrants).values({
        id: randomUUID(),
        userId: user.id,
        courseId,
        source: "invite_code",
      });
      granted++;
    }
  }
  if (granted > 0) {
    await db
      .update(schema.inviteCodes)
      .set({ usedCount: invite.usedCount + 1 })
      .where(eq(schema.inviteCodes.id, invite.id));
  }
  return { granted };
}
