import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const now = () => integer("created_at").notNull().$defaultFn(() => Date.now());

/* ─── Better Auth tables (managed by better-auth drizzle adapter) ─── */
export const user = sqliteTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("student"), // student | instructor | admin
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: id(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  id: id(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

/* ─── Batches & access ─── */
export const batches = sqliteTable("batches", {
  id: id(),
  name: text("name").notNull(),
  orgName: text("org_name"),
  startsOn: integer("starts_on"),
  endsOn: integer("ends_on"),
  notes: text("notes"),
  createdAt: now(),
});

export const batchMembers = sqliteTable(
  "batch_members",
  {
    id: id(),
    batchId: text("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: now(),
  },
  (t) => [uniqueIndex("uq_batch_member").on(t.batchId, t.userId)]
);

export const accessGrants = sqliteTable(
  "access_grants",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id").notNull(),
    source: text("source").notNull(), // batch | admin | invite_code | open
    batchId: text("batch_id"),
    grantedBy: text("granted_by"),
    expiresAt: integer("expires_at"),
    createdAt: now(),
  },
  (t) => [uniqueIndex("uq_grant").on(t.userId, t.courseId)]
);

export const inviteCodes = sqliteTable("invite_codes", {
  id: id(),
  code: text("code").notNull().unique(),
  courseIds: text("course_ids", { mode: "json" }).notNull().$type<string[]>(),
  maxUses: integer("max_uses").notNull().default(100),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at"),
  note: text("note"),
  createdAt: now(),
});

/* ─── Courses & curriculum ─── */
export const courses = sqliteTable("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  certCode: text("cert_code").notNull(),
  level: text("level").notNull().default("Fundamentals"),
  language: text("language").notNull().default("English"),
  descriptionMd: text("description_md").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | published | archived
  accessMode: text("access_mode").notNull().default("provisioned"), // open | invite | provisioned
  accent: text("accent").notNull().default("azure"),
  position: integer("position").notNull().default(0),
  createdAt: now(),
});

export const modules = sqliteTable("modules", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  title: text("title").notNull(),
  createdAt: now(),
});

export type LessonContent = Record<string, unknown>;
export const lessons = sqliteTable(
  "lessons",
  {
    id: id(),
    moduleId: text("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    title: text("title").notNull(),
    kind: text("kind").notNull(), // video | presentation | pdf | article | resource | checkpoint
    content: text("content", { mode: "json" }).notNull().$type<LessonContent>(),
    durationSeconds: integer("duration_seconds"),
    isFreePreview: integer("is_free_preview", { mode: "boolean" }).notNull().default(false),
    createdAt: now(),
  },
  (t) => [index("ix_lessons_module").on(t.moduleId)]
);

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("started"), // started | completed
    position: integer("position").notNull().default(0),
    completedAt: integer("completed_at"),
    createdAt: now(),
  },
  (t) => [uniqueIndex("uq_progress").on(t.userId, t.lessonId)]
);

/* ─── Question Bank ─── */
export const questionPools = sqliteTable("question_pools", {
  id: id(),
  certCode: text("cert_code").notNull(),
  domainCode: text("domain_code").notNull(),
  title: text("title").notNull(),
  createdAt: now(),
});

export const questions = sqliteTable(
  "questions",
  {
    id: id(),
    poolId: text("pool_id").notNull().references(() => questionPools.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // single_choice | multi_choice | true_false | drag_order | drag_match | fill_blank
    stemMd: text("stem_md").notNull(),
    options: text("options", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    answer: text("answer", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    explanationMd: text("explanation_md").notNull().default(""),
    difficulty: text("difficulty").notNull().default("core"), // intro | core | stretch
    status: text("status").notNull().default("live"), // draft | review | live | retired
    stats: text("stats", { mode: "json" }).$type<{ attempts: number; correct: number }>(),
    createdAt: now(),
  },
  (t) => [index("ix_questions_pool").on(t.poolId)]
);

/* ─── Exams ─── */
export const exams = sqliteTable("exams", {
  id: id(),
  courseId: text("course_id"),
  title: text("title").notNull(),
  certCode: text("cert_code").notNull(),
  mode: text("mode").notNull(), // practice | simulation
  blueprint: text("blueprint", { mode: "json" }).notNull().$type<{ poolId: string; count: number }[]>(),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  passScaled: integer("pass_scaled").notNull().default(700),
  shuffleQuestions: integer("shuffle_questions", { mode: "boolean" }).notNull().default(true),
  shuffleOptions: integer("shuffle_options", { mode: "boolean" }).notNull().default(true),
  reviewPolicy: text("review_policy").notNull().default("immediate"),
  status: text("status").notNull().default("published"),
  createdAt: now(),
});

export type FrozenQuestion = { qid: string; optionOrder?: string[] };
export const examAttempts = sqliteTable(
  "exam_attempts",
  {
    id: id(),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("in_progress"), // in_progress | submitted | auto_submitted
    questionSet: text("question_set", { mode: "json" }).notNull().$type<FrozenQuestion[]>(),
    startedAt: integer("started_at").notNull(),
    deadlineAt: integer("deadline_at").notNull(),
    submittedAt: integer("submitted_at"),
    rawScore: real("raw_score"),
    scaledScore: integer("scaled_score"),
    passed: integer("passed", { mode: "boolean" }),
    domainScores: text("domain_scores", { mode: "json" }).$type<
      { domainCode: string; title: string; correct: number; total: number }[]
    >(),
    createdAt: now(),
  },
  (t) => [index("ix_attempts_user").on(t.userId)]
);

export const attemptResponses = sqliteTable(
  "attempt_responses",
  {
    id: id(),
    attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    position: integer("position").notNull(),
    response: text("response", { mode: "json" }).$type<Record<string, unknown>>(),
    isFlagged: integer("is_flagged", { mode: "boolean" }).notNull().default(false),
    answeredAt: integer("answered_at"),
    isCorrect: integer("is_correct", { mode: "boolean" }),
  },
  (t) => [uniqueIndex("uq_response").on(t.attemptId, t.questionId)]
);

/* ─── Engagement ─── */
export const lessonQuestions = sqliteTable("lesson_questions", {
  id: id(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  bodyMd: text("body_md").notNull(),
  parentId: text("parent_id"),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
});

export const notes = sqliteTable("notes", {
  id: id(),
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  anchor: text("anchor", { mode: "json" }).$type<Record<string, number>>(),
  bodyMd: text("body_md").notNull(),
  createdAt: now(),
});

export const activityLog = sqliteTable("activity_log", {
  id: id(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"),
  createdAt: now(),
});
