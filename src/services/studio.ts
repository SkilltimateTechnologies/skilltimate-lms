import { db, schema } from "@/db";
import { and, asc, desc, eq, inArray, count } from "drizzle-orm";
import { AuthError } from "@/lib/session";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

type SessionUser = { id: string; role?: string | null };

function need(cond: unknown, msg: string) {
  if (!cond) throw new AuthError(msg, 422);
}

function assertStaff(user: SessionUser) {
  if (user.role !== "admin" && user.role !== "instructor") throw new AuthError("Forbidden", 403);
}

async function log(userId: string, action: string, entity: string, entityId?: string, detail?: string) {
  await db.insert(schema.activityLog).values({ id: randomUUID(), userId, action, entity, entityId, detail });
}

/* ─── Courses ─── */
export async function upsertCourse(user: SessionUser, input: Partial<typeof schema.courses.$inferInsert> & { id?: string }) {
  assertStaff(user);
  if (input.id) {
    const { id, ...rest } = input;
    await db.update(schema.courses).set(rest).where(eq(schema.courses.id, id));
    await log(user.id, "update", "course", id, input.title ?? undefined);
    return { id };
  }
  const id = randomUUID();
  await db.insert(schema.courses).values({
    id,
    slug: input.slug || `course-${id.slice(0, 6)}`,
    title: input.title || "Untitled course",
    certCode: input.certCode || "GEN",
    ...input,
  } as typeof schema.courses.$inferInsert);
  await log(user.id, "create", "course", id, input.title ?? undefined);
  return { id };
}

export async function upsertModule(user: SessionUser, input: { id?: string; courseId: string; title: string; position?: number }) {
  assertStaff(user);
  if (input.id) {
    await db.update(schema.modules).set({ title: input.title, position: input.position ?? 0 }).where(eq(schema.modules.id, input.id));
    return { id: input.id };
  }
  const id = randomUUID();
  const [c] = await db.select({ n: count() }).from(schema.modules).where(eq(schema.modules.courseId, input.courseId));
  await db.insert(schema.modules).values({ id, courseId: input.courseId, title: input.title, position: input.position ?? c.n });
  await log(user.id, "create", "module", id, input.title);
  return { id };
}

export async function upsertLesson(
  user: SessionUser,
  input: { id?: string; moduleId: string; title: string; kind: string; content: Record<string, unknown>; position?: number; durationSeconds?: number | null }
) {
  assertStaff(user);
  if (input.id) {
    await db
      .update(schema.lessons)
      .set({ title: input.title, kind: input.kind, content: input.content, durationSeconds: input.durationSeconds ?? null })
      .where(eq(schema.lessons.id, input.id));
    await log(user.id, "update", "lesson", input.id, input.title);
    return { id: input.id };
  }
  const id = randomUUID();
  const [c] = await db.select({ n: count() }).from(schema.lessons).where(eq(schema.lessons.moduleId, input.moduleId));
  await db.insert(schema.lessons).values({
    id,
    moduleId: input.moduleId,
    title: input.title,
    kind: input.kind,
    content: input.content,
    position: input.position ?? c.n,
    durationSeconds: input.durationSeconds ?? null,
  });
  await log(user.id, "create", "lesson", id, input.title);
  return { id };
}

export async function deleteLesson(user: SessionUser, id: string) {
  assertStaff(user);
  need(id, "Lesson id is required");
  await db.delete(schema.lessons).where(eq(schema.lessons.id, id));
  await log(user.id, "delete", "lesson", id);
  return { ok: true };
}

/* ─── Question bank ─── */
export async function listBank(user: SessionUser) {
  assertStaff(user);
  const pools = await db.query.questionPools.findMany({ orderBy: [asc(schema.questionPools.certCode), asc(schema.questionPools.domainCode)] });
  const qs = await db.query.questions.findMany({ orderBy: [desc(schema.questions.createdAt)] });
  return { pools, questions: qs };
}

export async function upsertPool(user: SessionUser, input: { id?: string; certCode: string; domainCode: string; title: string }) {
  assertStaff(user);
  need(input.certCode && input.domainCode && input.title, "certCode, domainCode and title are required");
  if (input.id) {
    await db.update(schema.questionPools).set(input).where(eq(schema.questionPools.id, input.id));
    return { id: input.id };
  }
  const id = randomUUID();
  await db.insert(schema.questionPools).values({ id, ...input });
  return { id };
}

export async function upsertQuestion(
  user: SessionUser,
  input: {
    id?: string;
    poolId: string;
    type: string;
    stemMd: string;
    options: Record<string, unknown>;
    answer: Record<string, unknown>;
    explanationMd?: string;
    difficulty?: string;
    status?: string;
  }
) {
  assertStaff(user);
  need(input.poolId && input.type && input.stemMd, "poolId, type and stemMd are required");
  if (input.id) {
    const existing = await db.query.questions.findFirst({ where: eq(schema.questions.id, input.id) });
    if (existing?.status === "live" && (input.status ?? "live") === "live") {
      // live questions are immutable: retire the old, version in the new
      await db.update(schema.questions).set({ status: "retired" }).where(eq(schema.questions.id, input.id));
      const id = randomUUID();
      await db.insert(schema.questions).values({ ...input, id, status: "live" } as typeof schema.questions.$inferInsert);
      await log(user.id, "version", "question", id);
      return { id, versioned: true };
    }
    const { id, ...rest } = input;
    await db.update(schema.questions).set(rest as never).where(eq(schema.questions.id, id));
    return { id };
  }
  const id = randomUUID();
  await db.insert(schema.questions).values({ id, explanationMd: "", ...input } as typeof schema.questions.$inferInsert);
  await log(user.id, "create", "question", id);
  return { id };
}

export async function importQuestionsCsv(user: SessionUser, poolId: string, csv: string) {
  assertStaff(user);
  // Format: type|stem|choiceA;choiceB;...|answerIds(comma)|explanation
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  let imported = 0;
  const errors: string[] = [];
  for (const [i, line] of lines.entries()) {
    const parts = line.split("|");
    if (parts.length < 4) {
      errors.push(`Line ${i + 1}: expected at least 4 pipe-separated fields`);
      continue;
    }
    const [type, stem, choicesRaw, answerRaw, explanation = ""] = parts;
    try {
      let options: Record<string, unknown> = {};
      let answer: Record<string, unknown> = {};
      if (type === "single_choice" || type === "multi_choice") {
        const choices = choicesRaw.split(";").map((c, idx) => ({ id: String.fromCharCode(97 + idx), text: c.trim() }));
        options = { choices, ...(type === "multi_choice" ? { select: answerRaw.split(",").length } : {}) };
        answer =
          type === "single_choice"
            ? { choice: answerRaw.trim() }
            : { choices: answerRaw.split(",").map((s) => s.trim()) };
      } else if (type === "true_false") {
        options = {};
        answer = { value: answerRaw.trim().toLowerCase() === "true" };
      } else if (type === "fill_blank") {
        options = { placeholder: choicesRaw.trim() };
        answer = { accept: answerRaw.split(",").map((s) => s.trim()) };
      } else {
        errors.push(`Line ${i + 1}: CSV import supports single_choice, multi_choice, true_false, fill_blank`);
        continue;
      }
      await db.insert(schema.questions).values({
        id: randomUUID(),
        poolId,
        type,
        stemMd: stem.trim(),
        options,
        answer,
        explanationMd: explanation.trim(),
        status: "draft",
      });
      imported++;
    } catch (e) {
      errors.push(`Line ${i + 1}: ${(e as Error).message}`);
    }
  }
  await log(user.id, "import", "questions", poolId, `${imported} imported`);
  return { imported, errors };
}

/* ─── Exams ─── */
export async function upsertExam(
  user: SessionUser,
  input: {
    id?: string;
    title: string;
    certCode: string;
    mode: string;
    courseId?: string | null;
    blueprint: { poolId: string; count: number }[];
    durationMinutes: number;
    passScaled?: number;
    status?: string;
  }
) {
  assertStaff(user);
  need(input.title && input.certCode && input.mode, "title, certCode and mode are required");
  need(Array.isArray(input.blueprint) && input.blueprint.every((b) => b?.poolId && b.count > 0), "Blueprint needs at least poolId and count per row");
  if (input.id) {
    const { id, ...rest } = input;
    await db.update(schema.exams).set(rest as never).where(eq(schema.exams.id, id));
    await log(user.id, "update", "exam", id, input.title);
    return { id };
  }
  const id = randomUUID();
  await db.insert(schema.exams).values({ id, ...input } as typeof schema.exams.$inferInsert);
  await log(user.id, "create", "exam", id, input.title);
  return { id };
}

/* ─── People & batches ─── */
export async function listPeople(user: SessionUser) {
  assertStaff(user);
  const users = await db.query.user.findMany({ orderBy: [desc(schema.user.createdAt)] });
  const grants = await db.query.accessGrants.findMany();
  const bs = await db.query.batches.findMany({ orderBy: [desc(schema.batches.createdAt)] });
  const members = await db.query.batchMembers.findMany();
  return { users, grants, batches: bs, members };
}

export async function createBatch(user: SessionUser, input: { name: string; orgName?: string }) {
  assertStaff(user);
  const id = randomUUID();
  await db.insert(schema.batches).values({ id, name: input.name, orgName: input.orgName });
  await log(user.id, "create", "batch", id, input.name);
  return { id };
}

/** CSV: name,email — creates accounts (temp password), adds to batch, grants courses. */
export async function provisionBatch(
  user: SessionUser,
  input: { batchId: string; csv: string; courseIds: string[]; tempPassword: string }
) {
  assertStaff(user);
  need(input.batchId && input.csv && Array.isArray(input.courseIds), "batchId, csv and courseIds are required");
  need(typeof input.tempPassword === "string", "Temp password is required");
  if (input.tempPassword.length < 8) throw new AuthError("Temp password must be at least 8 characters", 422);
  const lines = input.csv.split("\n").map((l) => l.trim()).filter(Boolean);
  let created = 0,
    enrolled = 0;
  const errors: string[] = [];
  for (const [i, line] of lines.entries()) {
    const [name, email] = line.split(",").map((s) => s?.trim());
    if (!name || !email || !email.includes("@")) {
      errors.push(`Line ${i + 1}: expected "name,email"`);
      continue;
    }
    let target = await db.query.user.findFirst({ where: eq(schema.user.email, email.toLowerCase()) });
    if (!target) {
      try {
        const res = await auth.api.createUser({
          body: { email: email.toLowerCase(), password: input.tempPassword, name, role: "student" as never },
        });
        target = res.user as unknown as typeof schema.user.$inferSelect;
        created++;
      } catch (e) {
        errors.push(`Line ${i + 1}: ${(e as Error).message}`);
        continue;
      }
    }
    const existingMember = await db.query.batchMembers.findFirst({
      where: and(eq(schema.batchMembers.batchId, input.batchId), eq(schema.batchMembers.userId, target.id)),
    });
    if (!existingMember) {
      await db.insert(schema.batchMembers).values({ id: randomUUID(), batchId: input.batchId, userId: target.id });
    }
    for (const courseId of input.courseIds) {
      const g = await db.query.accessGrants.findFirst({
        where: and(eq(schema.accessGrants.userId, target.id), eq(schema.accessGrants.courseId, courseId)),
      });
      if (!g) {
        await db.insert(schema.accessGrants).values({
          id: randomUUID(),
          userId: target.id,
          courseId,
          source: "batch",
          batchId: input.batchId,
          grantedBy: user.id,
        });
        enrolled++;
      }
    }
  }
  await log(user.id, "provision", "batch", input.batchId, `${created} created, ${enrolled} grants`);
  return { created, enrolled, errors };
}

export async function grantCourse(user: SessionUser, targetUserId: string, courseId: string) {
  assertStaff(user);
  need(targetUserId && courseId, "userId and courseId are required");
  const existing = await db.query.accessGrants.findFirst({
    where: and(eq(schema.accessGrants.userId, targetUserId), eq(schema.accessGrants.courseId, courseId)),
  });
  if (existing) return { id: existing.id };
  const id = randomUUID();
  await db.insert(schema.accessGrants).values({ id, userId: targetUserId, courseId, source: "admin", grantedBy: user.id });
  await log(user.id, "grant", "access", id, `${targetUserId} → ${courseId}`);
  return { id };
}

export async function createInvite(user: SessionUser, input: { code: string; courseIds: string[]; maxUses: number; note?: string }) {
  assertStaff(user);
  need(input.code && Array.isArray(input.courseIds) && input.courseIds.length > 0, "code and at least one course are required");
  const id = randomUUID();
  await db.insert(schema.inviteCodes).values({
    id,
    code: input.code.trim().toUpperCase(),
    courseIds: input.courseIds,
    maxUses: input.maxUses,
    note: input.note,
  });
  await log(user.id, "create", "invite", id, input.code);
  return { id };
}

export async function gradebook(user: SessionUser, batchId: string) {
  assertStaff(user);
  const members = await db.query.batchMembers.findMany({ where: eq(schema.batchMembers.batchId, batchId) });
  const userIds = members.map((m) => m.userId);
  const users = userIds.length ? await db.query.user.findMany({ where: inArray(schema.user.id, userIds) }) : [];
  const attempts = userIds.length
    ? await db.query.examAttempts.findMany({ where: inArray(schema.examAttempts.userId, userIds), orderBy: [desc(schema.examAttempts.startedAt)] })
    : [];
  const allExams = await db.query.exams.findMany();
  return { users, attempts, exams: allExams };
}

export async function studioOverview(user: SessionUser) {
  assertStaff(user);
  const [students] = await db.select({ n: count() }).from(schema.user).where(eq(schema.user.role, "student"));
  const [grants] = await db.select({ n: count() }).from(schema.accessGrants);
  const [attempts] = await db.select({ n: count() }).from(schema.examAttempts);
  const [liveQ] = await db.select({ n: count() }).from(schema.questions).where(eq(schema.questions.status, "live"));
  const recent = await db.query.examAttempts.findMany({ orderBy: [desc(schema.examAttempts.startedAt)], limit: 12 });
  const allExams = await db.query.exams.findMany();
  const users = await db.query.user.findMany();
  const activity = await db.query.activityLog.findMany({ orderBy: [desc(schema.activityLog.createdAt)], limit: 15 });
  return { students: students.n, grants: grants.n, attempts: attempts.n, liveQuestions: liveQ.n, recent, exams: allExams, users, activity };
}
