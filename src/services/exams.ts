import { db, schema } from "@/db";
import { and, eq, gt, inArray, desc, sql } from "drizzle-orm";
import { AuthError } from "@/lib/session";
import { randomUUID } from "crypto";

type SessionUser = { id: string; role?: string | null };

/* ─────────── scoring per question type ─────────── */
export function scoreResponse(
  q: { type: string; answer: Record<string, unknown> },
  response: Record<string, unknown> | null | undefined
): boolean {
  if (!response) return false;
  const a = q.answer as any;
  const r = response as any;
  switch (q.type) {
    case "single_choice":
      return typeof r.choice === "string" && r.choice === a.choice;
    case "true_false":
      return typeof r.value === "boolean" && r.value === a.value;
    case "multi_choice": {
      const want = [...((a.choices as string[]) || [])].sort();
      const got = Array.isArray(r.choices) ? [...r.choices].sort() : [];
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case "drag_order": {
      const want = (a.order as string[]) || [];
      const got = Array.isArray(r.order) ? (r.order as string[]) : [];
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case "drag_match": {
      const want = (a.pairs as Record<string, string>) || {};
      const got = (r.pairs as Record<string, string>) || {};
      const keys = Object.keys(want);
      return keys.length > 0 && keys.every((k) => got[k] === want[k]);
    }
    case "fill_blank": {
      const accepted = ((a.accept as string[]) || []).map((s) => s.trim().toLowerCase());
      const got = typeof r.text === "string" ? r.text.trim().toLowerCase() : "";
      return got.length > 0 && accepted.includes(got);
    }
    default:
      return false;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────── start an attempt: freeze the paper ─────────── */
export async function startAttempt(user: SessionUser, examId: string) {
  const exam = await db.query.exams.findFirst({ where: eq(schema.exams.id, examId) });
  if (!exam || exam.status !== "published") throw new AuthError("Exam not found", 404);

  // Resume an open attempt instead of forking a second paper
  const open = await db.query.examAttempts.findFirst({
    where: and(
      eq(schema.examAttempts.examId, examId),
      eq(schema.examAttempts.userId, user.id),
      eq(schema.examAttempts.status, "in_progress"),
      gt(schema.examAttempts.deadlineAt, Date.now())
    ),
  });
  if (open) return { attemptId: open.id, resumed: true };

  // Resolve blueprint → frozen randomized question set
  const frozen: { qid: string; optionOrder?: string[] }[] = [];
  for (const slot of exam.blueprint) {
    const pool = await db.query.questions.findMany({
      where: and(eq(schema.questions.poolId, slot.poolId), eq(schema.questions.status, "live")),
    });
    const picked = (exam.shuffleQuestions ? shuffle(pool) : pool).slice(0, slot.count);
    for (const q of picked) {
      let optionOrder: string[] | undefined;
      if (exam.shuffleOptions && (q.type === "single_choice" || q.type === "multi_choice")) {
        const choices = ((q.options as any).choices as { id: string }[]) || [];
        optionOrder = shuffle(choices.map((c) => c.id));
      }
      if (q.type === "drag_order") {
        const items = ((q.options as any).items as { id: string }[]) || [];
        optionOrder = shuffle(items.map((c) => c.id));
      }
      frozen.push({ qid: q.id, optionOrder });
    }
  }
  if (frozen.length === 0) throw new AuthError("Exam has no live questions", 409);
  const ordered = exam.shuffleQuestions ? shuffle(frozen) : frozen;

  const attemptId = randomUUID();
  const startedAt = Date.now();
  await db.insert(schema.examAttempts).values({
    id: attemptId,
    examId,
    userId: user.id,
    questionSet: ordered,
    startedAt,
    deadlineAt: exam.mode === "simulation" ? startedAt + exam.durationMinutes * 60_000 : startedAt + 24 * 3600_000,
  });
  await db.insert(schema.attemptResponses).values(
    ordered.map((f, i) => ({
      id: randomUUID(),
      attemptId,
      questionId: f.qid,
      position: i,
    }))
  );
  return { attemptId, resumed: false };
}

/* ─────────── attempt state for the runner (answers stripped) ─────────── */
export async function getRunnerState(user: SessionUser, attemptId: string) {
  const attempt = await db.query.examAttempts.findFirst({
    where: and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, user.id)),
  });
  if (!attempt) throw new AuthError("Attempt not found", 404);
  const exam = (await db.query.exams.findFirst({ where: eq(schema.exams.id, attempt.examId) }))!;
  const qids = attempt.questionSet.map((f) => f.qid);
  const qs = await db.query.questions.findMany({ where: inArray(schema.questions.id, qids) });
  const responses = await db.query.attemptResponses.findMany({
    where: eq(schema.attemptResponses.attemptId, attemptId),
  });
  const byId = new Map(qs.map((q) => [q.id, q]));
  const respByQ = new Map(responses.map((r) => [r.questionId, r]));

  const questions = attempt.questionSet.map((f, i) => {
    const q = byId.get(f.qid)!;
    const opts = { ...(q.options as any) };
    // apply frozen shuffle order
    if (f.optionOrder && Array.isArray(opts.choices)) {
      const m = new Map(opts.choices.map((c: any) => [c.id, c]));
      opts.choices = f.optionOrder.map((cid) => m.get(cid)).filter(Boolean);
    }
    if (f.optionOrder && Array.isArray(opts.items)) {
      const m = new Map(opts.items.map((c: any) => [c.id, c]));
      opts.items = f.optionOrder.map((cid) => m.get(cid)).filter(Boolean);
    }
    const r = respByQ.get(f.qid);
    return {
      position: i,
      questionId: q.id,
      type: q.type,
      stemMd: q.stemMd,
      options: opts,
      response: r?.response ?? null,
      isFlagged: r?.isFlagged ?? false,
      // answers & explanations NEVER ship in in-progress payloads
    };
  });

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      serverNow: Date.now(),
    },
    exam: {
      id: exam.id,
      title: exam.title,
      certCode: exam.certCode,
      mode: exam.mode,
      durationMinutes: exam.durationMinutes,
      passScaled: exam.passScaled,
      total: attempt.questionSet.length,
    },
    questions,
  };
}

/* ─────────── guarded answer save: the deadline travels with the write ─────────── */
export async function saveResponse(
  user: SessionUser,
  attemptId: string,
  questionId: string,
  response: Record<string, unknown>
) {
  const nowMs = Date.now();
  const result = await db
    .update(schema.attemptResponses)
    .set({ response, answeredAt: nowMs })
    .where(
      and(
        eq(schema.attemptResponses.attemptId, attemptId),
        eq(schema.attemptResponses.questionId, questionId),
        sql`EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = ${attemptId} AND ea.user_id = ${user.id} AND ea.status = 'in_progress' AND ea.deadline_at > ${nowMs})`
      )
    );
  if ((result as any).rowsAffected === 0) throw new AuthError("Attempt is closed", 409);
  return { saved: true, at: nowMs };
}

export async function toggleFlag(user: SessionUser, attemptId: string, questionId: string, flagged: boolean) {
  const nowMs = Date.now();
  const result = await db
    .update(schema.attemptResponses)
    .set({ isFlagged: flagged })
    .where(
      and(
        eq(schema.attemptResponses.attemptId, attemptId),
        eq(schema.attemptResponses.questionId, questionId),
        sql`EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = ${attemptId} AND ea.user_id = ${user.id} AND ea.status = 'in_progress' AND ea.deadline_at > ${nowMs})`
      )
    );
  if ((result as any).rowsAffected === 0) throw new AuthError("Attempt is closed", 409);
  return { flagged };
}

/* ─────────── practice-mode instant check (server-side) ─────────── */
export async function checkAnswer(
  user: SessionUser,
  attemptId: string,
  questionId: string,
  response: Record<string, unknown>
) {
  const attempt = await db.query.examAttempts.findFirst({
    where: and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, user.id)),
  });
  if (!attempt) throw new AuthError("Attempt not found", 404);
  const exam = (await db.query.exams.findFirst({ where: eq(schema.exams.id, attempt.examId) }))!;
  if (exam.mode !== "practice") throw new AuthError("Feedback only in practice mode", 403);
  await saveResponse(user, attemptId, questionId, response);
  const q = (await db.query.questions.findFirst({ where: eq(schema.questions.id, questionId) }))!;
  const correct = scoreResponse(q as any, response);
  await db
    .update(schema.attemptResponses)
    .set({ isCorrect: correct })
    .where(and(eq(schema.attemptResponses.attemptId, attemptId), eq(schema.attemptResponses.questionId, questionId)));
  return { correct, answer: q.answer, explanationMd: q.explanationMd };
}

/* ─────────── submit & score ─────────── */
export async function submitAttempt(user: SessionUser, attemptId: string, auto = false) {
  const attempt = await db.query.examAttempts.findFirst({
    where: and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, user.id)),
  });
  if (!attempt) throw new AuthError("Attempt not found", 404);
  if (attempt.status !== "in_progress") return { attemptId, alreadyScored: true };

  const exam = (await db.query.exams.findFirst({ where: eq(schema.exams.id, attempt.examId) }))!;
  const qids = attempt.questionSet.map((f) => f.qid);
  const qs = await db.query.questions.findMany({ where: inArray(schema.questions.id, qids) });
  const pools = await db.query.questionPools.findMany();
  const poolById = new Map(pools.map((p) => [p.id, p]));
  const responses = await db.query.attemptResponses.findMany({
    where: eq(schema.attemptResponses.attemptId, attemptId),
  });
  const respByQ = new Map(responses.map((r) => [r.questionId, r]));

  let correct = 0;
  const domain: Record<string, { domainCode: string; title: string; correct: number; total: number }> = {};
  for (const q of qs) {
    const r = respByQ.get(q.id);
    const ok = scoreResponse(q as any, (r?.response as any) ?? null);
    if (ok) correct++;
    await db
      .update(schema.attemptResponses)
      .set({ isCorrect: ok })
      .where(and(eq(schema.attemptResponses.attemptId, attemptId), eq(schema.attemptResponses.questionId, q.id)));
    const pool = poolById.get(q.poolId);
    const key = pool?.domainCode ?? "?";
    domain[key] ??= { domainCode: key, title: pool?.title ?? "General", correct: 0, total: 0 };
    domain[key].total++;
    if (ok) domain[key].correct++;
    // rolling item stats
    const stats = (q.stats as any) || { attempts: 0, correct: 0 };
    await db
      .update(schema.questions)
      .set({ stats: { attempts: stats.attempts + 1, correct: stats.correct + (ok ? 1 : 0) } })
      .where(eq(schema.questions.id, q.id));
  }
  const total = qs.length;
  const scaled = total > 0 ? Math.round((1000 * correct) / total) : 0;
  await db
    .update(schema.examAttempts)
    .set({
      status: auto ? "auto_submitted" : "submitted",
      submittedAt: Date.now(),
      rawScore: correct,
      scaledScore: scaled,
      passed: scaled >= exam.passScaled,
      domainScores: Object.values(domain).sort((a, b) => a.domainCode.localeCompare(b.domainCode)),
    })
    .where(eq(schema.examAttempts.id, attemptId));
  return { attemptId, scaled, passed: scaled >= exam.passScaled };
}

/* ─────────── deadline sweep (called opportunistically + by worker) ─────────── */
export async function sweepOverdue() {
  const overdue = await db.query.examAttempts.findMany({
    where: and(eq(schema.examAttempts.status, "in_progress"), sql`deadline_at <= ${Date.now()}`),
  });
  for (const a of overdue) await submitAttempt({ id: a.userId }, a.id, true);
  return overdue.length;
}

/* ─────────── results (answers allowed post-submission) ─────────── */
export async function getResult(user: SessionUser, attemptId: string) {
  await sweepOverdue();
  const attempt = await db.query.examAttempts.findFirst({
    where: and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, user.id)),
  });
  if (!attempt) throw new AuthError("Attempt not found", 404);
  if (attempt.status === "in_progress") throw new AuthError("Attempt still in progress", 409);
  const exam = (await db.query.exams.findFirst({ where: eq(schema.exams.id, attempt.examId) }))!;
  const qids = attempt.questionSet.map((f) => f.qid);
  const qs = await db.query.questions.findMany({ where: inArray(schema.questions.id, qids) });
  const byId = new Map(qs.map((q) => [q.id, q]));
  const responses = await db.query.attemptResponses.findMany({
    where: eq(schema.attemptResponses.attemptId, attemptId),
  });
  const respByQ = new Map(responses.map((r) => [r.questionId, r]));
  const review = attempt.questionSet.map((f, i) => {
    const q = byId.get(f.qid)!;
    const r = respByQ.get(f.qid);
    return {
      position: i,
      type: q.type,
      stemMd: q.stemMd,
      options: q.options,
      answer: q.answer,
      explanationMd: q.explanationMd,
      response: r?.response ?? null,
      isCorrect: r?.isCorrect ?? false,
    };
  });
  // score trend across this user's attempts on the same exam
  const history = await db.query.examAttempts.findMany({
    where: and(eq(schema.examAttempts.examId, attempt.examId), eq(schema.examAttempts.userId, user.id)),
    orderBy: [desc(schema.examAttempts.startedAt)],
  });
  const trend = history
    .filter((h) => h.status !== "in_progress" && h.scaledScore != null)
    .map((h) => ({ at: h.submittedAt ?? h.startedAt, scaled: h.scaledScore!, id: h.id }))
    .reverse();
  return { attempt, exam, review, trend };
}

export async function listExamsForUser(user: SessionUser) {
  await sweepOverdue();
  const all = await db.query.exams.findMany({ where: eq(schema.exams.status, "published") });
  const attempts = await db.query.examAttempts.findMany({
    where: eq(schema.examAttempts.userId, user.id),
    orderBy: [desc(schema.examAttempts.startedAt)],
  });
  return { exams: all, attempts };
}
