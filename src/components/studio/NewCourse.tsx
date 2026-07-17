"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCourse() {
  const [title, setTitle] = useState("");
  const [cert, setCert] = useState("");
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/studio/courses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, certCode: cert.toUpperCase(), slug: slug.toLowerCase() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Could not create"); return; }
    router.push(`/studio/courses/${data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={create} className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className="field" style={{ margin: 0, flex: "1 1 220px" }}>
        <label htmlFor="nct">New course title</label>
        <input id="nct" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="field" style={{ margin: 0, width: 130 }}>
        <label htmlFor="ncc">Cert code</label>
        <input id="ncc" className="input mono" placeholder="AZ-900" value={cert} onChange={(e) => setCert(e.target.value)} required />
      </div>
      <div className="field" style={{ margin: 0, width: 170 }}>
        <label htmlFor="ncs">Slug</label>
        <input id="ncs" className="input mono" placeholder="az-900" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>
      <button className={`btn${busy ? " loading" : ""}`} disabled={busy}>Create</button>
      {err && <p className="btn-err" style={{ width: "100%" }}>{err}</p>}
    </form>
  );
}
