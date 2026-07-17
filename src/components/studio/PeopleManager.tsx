"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type U = { id: string; name: string; email: string; role: string };
type Batch = { id: string; name: string; orgName: string | null };
type Course = { id: string; title: string; certCode: string };
type Grant = { userId: string; courseId: string };
type Member = { batchId: string; userId: string };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function PeopleManager({ users, batches, courses, grants, members }: { users: U[]; batches: Batch[]; courses: Course[]; grants: Grant[]; members: Member[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [batchName, setBatchName] = useState("");
  const [org, setOrg] = useState("");

  const [provBatch, setProvBatch] = useState(batches[0]?.id ?? "");
  const [provCsv, setProvCsv] = useState("");
  const [provCourses, setProvCourses] = useState<string[]>([]);
  const [provPass, setProvPass] = useState("");

  const [invCode, setInvCode] = useState("");
  const [invCourses, setInvCourses] = useState<string[]>([]);
  const [invMax, setInvMax] = useState(100);

  const [grantUser, setGrantUser] = useState("");
  const [grantCourse, setGrantCourse] = useState(courses[0]?.id ?? "");

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await post("/api/studio/batches", { name: batchName.trim(), orgName: org.trim() || undefined });
      setBatchName(""); setOrg(""); setProvBatch(res.id);
      setToast({ text: "Batch created" });
      router.refresh();
    } catch (err) { setToast({ text: (err as Error).message, err: true }); }
  }

  async function provision() {
    setBusy(true);
    try {
      const res = await post("/api/studio/provision", { batchId: provBatch, csv: provCsv, courseIds: provCourses, tempPassword: provPass });
      setToast({ text: `${res.created} account(s) created · ${res.enrolled} grant(s)${res.errors.length ? ` · ${res.errors.length} line(s) skipped` : ""}` });
      setProvCsv("");
      router.refresh();
    } catch (err) { setToast({ text: (err as Error).message, err: true }); }
    setBusy(false);
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("/api/studio/invites", { code: invCode, courseIds: invCourses, maxUses: invMax });
      setToast({ text: `Invite ${invCode.toUpperCase()} created` });
      setInvCode("");
      router.refresh();
    } catch (err) { setToast({ text: (err as Error).message, err: true }); }
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post("/api/studio/grants", { userId: grantUser, courseId: grantCourse });
      setToast({ text: "Access granted" });
      router.refresh();
    } catch (err) { setToast({ text: (err as Error).message, err: true }); }
  }

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  return (
    <>
      <div className="main-head"><h1>People</h1></div>
      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Batches</h3>
          {batches.map((b) => (
            <p key={b.id} style={{ margin: "0 0 8px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span><b>{b.name}</b>{b.orgName ? <span className="mut"> · {b.orgName}</span> : null}
                <span className="faint mono" style={{ fontSize: "0.75rem" }}> · {members.filter((m) => m.batchId === b.id).length} members</span></span>
              <Link href={`/studio/people/${b.id}`}>Gradebook →</Link>
            </p>
          ))}
          {batches.length === 0 && <p className="mut" style={{ margin: 0 }}>No batches yet.</p>}
          <form onSubmit={createBatch} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: "1 1 140px" }} placeholder="Batch name" value={batchName} onChange={(e) => setBatchName(e.target.value)} required />
            <input className="input" style={{ flex: "1 1 140px" }} placeholder="College (optional)" value={org} onChange={(e) => setOrg(e.target.value)} />
            <button className="btn ghost small" disabled={!batchName.trim()}>Create</button>
          </form>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Invite codes</h3>
          <form onSubmit={createInvite}>
            <div className="field">
              <label htmlFor="ivc">Code</label>
              <input id="ivc" className="input mono" style={{ textTransform: "uppercase" }} placeholder="AZ900-SPRING" value={invCode} onChange={(e) => setInvCode(e.target.value)} required />
            </div>
            <div className="field">
              <label>Unlocks</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {courses.map((c) => (
                  <button type="button" key={c.id} className="btn ghost small"
                    style={invCourses.includes(c.id) ? { borderColor: "var(--accent)", color: "var(--accent-bright)" } : {}}
                    onClick={() => toggle(invCourses, setInvCourses, c.id)}>
                    {c.certCode}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="ivm">Max uses</label>
              <input id="ivm" type="number" min={1} className="input mono" value={invMax} onChange={(e) => setInvMax(Number(e.target.value))} />
            </div>
            <button className="btn small" disabled={!invCode.trim() || invCourses.length === 0}>Create invite</button>
          </form>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Provision a batch from CSV</h3>
        <p className="mut" style={{ fontSize: "0.85rem" }}>One student per line as <code>name,email</code>. Accounts are created with the temporary password below (existing accounts are simply enrolled). Share the password with the batch — students should change it after first sign-in.</p>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="pvb">Batch</label>
            <select id="pvb" className="input" value={provBatch} onChange={(e) => setProvBatch(e.target.value)}>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="pvp">Temp password (≥8 chars)</label>
            <input id="pvp" className="input mono" value={provPass} onChange={(e) => setProvPass(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Grant courses</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {courses.map((c) => (
                <button type="button" key={c.id} className="btn ghost small"
                  style={provCourses.includes(c.id) ? { borderColor: "var(--accent)", color: "var(--accent-bright)" } : {}}
                  onClick={() => toggle(provCourses, setProvCourses, c.id)}>
                  {c.certCode}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="pvc">Students CSV</label>
          <textarea id="pvc" className="input mono" style={{ minHeight: 130, fontSize: "0.82rem" }} placeholder={"Ananya Rao,ananya@college.edu\nRahul Verma,rahul@college.edu"} value={provCsv} onChange={(e) => setProvCsv(e.target.value)} />
        </div>
        <button className={`btn${busy ? " loading" : ""}`} disabled={busy || !provBatch || !provCsv.trim() || provPass.length < 8} onClick={provision}>
          Provision students
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Grant a single student access</h3>
        <form onSubmit={grant} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select className="input" style={{ flex: "2 1 240px", minWidth: 0 }} value={grantUser} onChange={(e) => setGrantUser(e.target.value)} required>
            <option value="" disabled>Choose student…</option>
            {users.filter((u) => u.role === "student").map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
          </select>
          <select className="input" style={{ flex: "1 1 160px", minWidth: 0 }} value={grantCourse} onChange={(e) => setGrantCourse(e.target.value)}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.certCode}</option>)}
          </select>
          <button className="btn ghost" disabled={!grantUser}>Grant</button>
        </form>
      </div>

      <h2 style={{ fontSize: "1.2rem" }}>All users</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Courses</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name}</b></td>
                <td>{u.email}</td>
                <td>{u.role === "student" ? u.role : <span className="tag">{u.role}</span>}</td>
                <td className="mono" style={{ fontSize: "0.78rem" }}>
                  {grants.filter((g) => g.userId === u.id).map((g) => courses.find((c) => c.id === g.courseId)?.certCode).filter(Boolean).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <div className={`toast${toast.err ? " err" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}
