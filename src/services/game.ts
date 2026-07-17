import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";

/* Honest gamification: every number below is derived from real activity
 * in this database — nothing is invented or padded.
 *   Lesson completed .......... +10 XP
 *   Mock attempt submitted ..... +20 XP
 *   Mock passed (≥700) ......... +30 XP bonus
 */
export const XP_RULES = { lesson: 10, attempt: 20, pass: 30 };

const LEVELS = [0, 60, 150, 280, 460, 700, 1000, 1360, 1780, 2260, 2800];

function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function playerStats(userId: string) {
  const [progress, attempts] = await Promise.all([
    db.query.lessonProgress.findMany({ where: and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.status, "completed")) }),
    db.query.examAttempts.findMany({ where: and(eq(schema.examAttempts.userId, userId), isNotNull(schema.examAttempts.submittedAt)) }),
  ]);

  const lessonsDone = progress.length;
  const attemptsDone = attempts.length;
  const passes = attempts.filter((a) => a.passed).length;
  const xp = lessonsDone * XP_RULES.lesson + attemptsDone * XP_RULES.attempt + passes * XP_RULES.pass;

  let level = 1;
  while (level < LEVELS.length && xp >= LEVELS[level]) level++;
  const floor = LEVELS[level - 1];
  const ceil = LEVELS[Math.min(level, LEVELS.length - 1)];
  const intoLevel = xp - floor;
  const levelSpan = Math.max(ceil - floor, 1);

  /* activity days: any lesson completion or attempt submission */
  const stamps = [
    ...progress.map((p) => p.completedAt).filter(Boolean) as number[],
    ...attempts.map((a) => a.submittedAt).filter(Boolean) as number[],
  ];
  const days = new Set(stamps.map(dayKey));

  /* streak: consecutive days ending today (or yesterday, so it doesn't break mid-day) */
  let streak = 0;
  const probe = new Date();
  if (!days.has(dayKey(probe.getTime()))) probe.setDate(probe.getDate() - 1);
  while (days.has(dayKey(probe.getTime()))) { streak++; probe.setDate(probe.getDate() - 1); }

  /* last 7 days, oldest → newest */
  const week: { label: string; active: boolean; today: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    week.push({ label: "SMTWTFS"[d.getDay()], active: days.has(dayKey(d.getTime())), today: i === 0 });
  }

  return { xp, level, intoLevel, levelSpan, nextLevelAt: ceil, maxLevel: level >= LEVELS.length, lessonsDone, attemptsDone, passes, streak, week };
}

/* Where should "Continue" take this user? Most recent lesson activity → that course's next incomplete lesson. */
export async function continueTarget(userId: string) {
  const recent = await db.query.lessonProgress.findMany({
    where: eq(schema.lessonProgress.userId, userId),
    orderBy: [desc(schema.lessonProgress.createdAt)],
    limit: 1,
  });
  if (!recent.length) return null;
  const lesson = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, recent[0].lessonId) });
  if (!lesson) return null;
  const mod = await db.query.modules.findFirst({ where: eq(schema.modules.id, lesson.moduleId) });
  if (!mod) return null;
  const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, mod.courseId) });
  if (!course) return null;

  const mods = await db.query.modules.findMany({ where: eq(schema.modules.courseId, course.id), orderBy: [schema.modules.position] });
  const all = await db.query.lessons.findMany({ where: inArray(schema.lessons.moduleId, mods.map((m) => m.id)), orderBy: [schema.lessons.position] });
  const ordered = mods.flatMap((m) => all.filter((l) => l.moduleId === m.id));
  const done = new Set(
    (await db.query.lessonProgress.findMany({ where: and(eq(schema.lessonProgress.userId, userId), eq(schema.lessonProgress.status, "completed")) })).map((p) => p.lessonId)
  );
  const next = ordered.find((l) => !done.has(l.id)) ?? ordered[ordered.length - 1];
  return next ? { courseSlug: course.slug, courseTitle: course.title, lessonId: next.id, lessonTitle: next.title, allDone: ordered.every((l) => done.has(l.id)) } : null;
}
