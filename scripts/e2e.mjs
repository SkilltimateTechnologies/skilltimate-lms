// E2E exam flow test — runs against a live server on :3000
const BASE = "http://127.0.0.1:3000";
let cookie = "";
let failures = 0;

function ok(name, cond, extra = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.log(`  ✗ FAIL: ${name} ${extra}`); }
}

async function req(method, path, body, expectJson = true) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Origin": BASE.replace("127.0.0.1", "localhost"),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setC = res.headers.getSetCookie?.() || [];
  if (setC.length) {
    // merge cookies
    const jar = new Map(cookie.split("; ").filter(Boolean).map(c => [c.split("=")[0], c]));
    for (const c of setC) { const p = c.split(";")[0]; jar.set(p.split("=")[0], p); }
    cookie = [...jar.values()].join("; ");
  }
  let data = null;
  if (expectJson) { try { data = await res.json(); } catch { data = null; } }
  else { data = await res.text(); }
  return { status: res.status, data };
}

console.log("1) Sign in as demo student");
{
  const { status, data } = await req("POST", "/api/auth/sign-in/email", {
    email: "demo@skilltimate.com",
    password: "Skilltimate#2026",
  });
  ok("sign-in 200", status === 200, `got ${status} ${JSON.stringify(data).slice(0, 200)}`);
  ok("session cookie set", cookie.includes("better-auth"));
}

console.log("2) Start practice attempt");
let attemptId, questions;
{
  // find exam id from the exams API surface: use runner start with slug lookup via page? We hit /api/attempts with examId — get exams by querying the learn page is html; instead the seed used deterministic? Query DB via API not available; use the exams listing endpoint if present.
  // We know practice exam title; fetch attempt start requires examId. Use the internal listing: GET not defined; so read local.db directly.
  const { createClient } = await import("@libsql/client");
  const db = createClient({ url: "file:local.db" });
  const ex = await db.execute("SELECT id, mode FROM exams WHERE mode = 'practice' LIMIT 1");
  const examId = ex.rows[0].id;
  const { status, data } = await req("POST", "/api/attempts", { examId });
  ok("attempt started", status === 200 && data?.attemptId, `got ${status} ${JSON.stringify(data).slice(0, 200)}`);
  attemptId = data.attemptId;
}

console.log("3) Runner state — answers must not leak");
{
  const { status, data } = await req("GET", `/api/attempts/${attemptId}`);
  ok("state 200", status === 200, `got ${status}`);
  questions = data?.questions || [];
  ok("questions present", questions.length > 0, `len ${questions.length}`);
  const leaked = JSON.stringify(questions).match(/"answer"|"explanation"/);
  ok("no answer/explanation fields in-progress", !leaked, leaked ? `leaked ${leaked[0]}` : "");
}

console.log("4) Answer every question correctly (read truth from DB)");
{
  const { createClient } = await import("@libsql/client");
  const db = createClient({ url: "file:local.db" });
  for (const q of questions) {
    const row = await db.execute({ sql: "SELECT type, answer FROM questions WHERE id = ?", args: [q.questionId] });
    const type = row.rows[0].type;
    const truth = JSON.parse(row.rows[0].answer);
    let response;
    if (type === "single_choice") response = { choice: truth.choice };
    else if (type === "true_false") response = { value: truth.value };
    else if (type === "multi_choice") response = { choices: truth.choices };
    else if (type === "drag_order") response = { order: truth.order };
    else if (type === "drag_match") response = { pairs: truth.pairs };
    else if (type === "fill_blank") response = { text: truth.accept[0] };
    const { status } = await req("POST", `/api/attempts/${attemptId}/answer`, { questionId: q.questionId, response });
    if (status !== 200) { ok(`save ${q.questionId}`, false, `status ${status}`); }
  }
  console.log(`  ✓ saved ${questions.length} answers`);
}

console.log("5) Flag toggle");
{
  const { status } = await req("POST", `/api/attempts/${attemptId}/flag`, { questionId: questions[0].questionId, flagged: true });
  ok("flag 200", status === 200, `got ${status}`);
}

console.log("6) Practice check endpoint returns answer+explanation");
{
  const { status, data } = await req("POST", `/api/attempts/${attemptId}/check`, { questionId: questions[0].questionId });
  ok("check 200", status === 200, `got ${status}`);
  ok("check returns answer", data && "answer" in data, JSON.stringify(data).slice(0, 120));
}

console.log("7) Submit → expect perfect scaled 1000");
{
  const { status, data } = await req("POST", `/api/attempts/${attemptId}/submit`, {});
  ok("submit 200", status === 200, `got ${status} ${JSON.stringify(data).slice(0, 200)}`);
  ok("scaled 1000", data?.scaled === 1000, `scaled=${data?.scaled}`);
  ok("passed", data?.passed === true || data?.passed === 1, `passed=${data?.passed}`);
}

console.log("8) Post-close answer save must 409");
{
  const { status } = await req("POST", `/api/attempts/${attemptId}/answer`, { questionId: questions[0].questionId, response: { choice: "x" } });
  ok("closed attempt rejects with 409", status === 409, `got ${status}`);
}

console.log("9) Results page renders");
{
  const { status, data } = await req("GET", `/learn/results/${attemptId}`, null, false);
  ok("results 200", status === 200, `got ${status}`);
  ok("verdict markup present", typeof data === "string" && data.includes("1000"), "");
}

console.log("10) Simulation attempt has a deadline");
{
  const { createClient } = await import("@libsql/client");
  const db = createClient({ url: "file:local.db" });
  const ex = await db.execute("SELECT id FROM exams WHERE mode = 'simulation' LIMIT 1");
  const { status, data } = await req("POST", "/api/attempts", { examId: ex.rows[0].id });
  ok("sim attempt started", status === 200, `got ${status}`);
  const st = await req("GET", `/api/attempts/${data.attemptId}`);
  ok("sim has deadline", !!st.data?.attempt?.deadlineAt, JSON.stringify(st.data).slice(0, 120));
  ok("sim question count 24", (st.data?.questions || []).length === 24, `len ${(st.data?.questions||[]).length}`);
}

console.log(failures === 0 ? "\nALL E2E CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
