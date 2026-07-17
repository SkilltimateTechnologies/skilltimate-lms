"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Lesson = { id: string; title: string; kind: string; content: Record<string, any>; moduleId: string };
type Mod = { id: string; title: string; lessons: Lesson[] };

const KINDS = ["article", "video", "presentation", "pdf", "resource", "checkpoint"] as const;

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function CurriculumEditor({
  course, modules,
}: { course: { id: string; title: string; status: string; slug: string }; modules: Mod[] }) {
  const router = useRouter();
  const [newModule, setNewModule] = useState("");
  const [drawer, setDrawer] = useState<null | { moduleId: string; lesson?: Lesson }>(null);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // drawer fields
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("article");
  const [mdBody, setMdBody] = useState("");
  const [assetId, setAssetId] = useState("");
  const [pdfFile, setPdfFile] = useState("");
  const [slidesText, setSlidesText] = useState("");
  const [note, setNote] = useState("");
  const [filesText, setFilesText] = useState("");

  function openDrawer(moduleId: string, lesson?: Lesson) {
    setDrawer({ moduleId, lesson });
    setTitle(lesson?.title ?? "");
    const k = (lesson?.kind as typeof kind) ?? "article";
    setKind(k);
    const c = lesson?.content ?? {};
    setMdBody((c.md as string) ?? "");
    setAssetId((c.asset_id as string) ?? "");
    setPdfFile((c.file as string) ?? "");
    setSlidesText(((c.slides as string[]) ?? []).join("\n"));
    setNote((c.note as string) ?? "");
    setFilesText(((c.files as { name: string; url: string }[]) ?? []).map((f) => `${f.name},${f.url}`).join("\n"));
  }

  function buildContent(): Record<string, unknown> {
    switch (kind) {
      case "article": return { md: mdBody };
      case "video": return { provider: "gumlet", asset_id: assetId.trim() };
      case "pdf": return { file: pdfFile.trim() };
      case "presentation": return { slides: slidesText.split("\n").map((s) => s.trim()).filter(Boolean) };
      case "checkpoint": return { note };
      case "resource":
        return {
          files: filesText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
            const [name, ...rest] = l.split(",");
            return { name: name.trim(), url: rest.join(",").trim() };
          }),
        };
    }
  }

  async function saveLesson() {
    if (!drawer || !title.trim()) return;
    setBusy(true);
    try {
      await post("/api/studio/lessons", {
        id: drawer.lesson?.id, moduleId: drawer.moduleId, title: title.trim(), kind, content: buildContent(),
      });
      setDrawer(null);
      setToast({ text: "Lesson saved" });
      router.refresh();
    } catch (e) { setToast({ text: (e as Error).message, err: true }); }
    setBusy(false);
  }

  async function removeLesson(id: string) {
    if (!confirm("Delete this lesson? Student progress on it is removed too.")) return;
    try {
      await post("/api/studio/lessons", { id }, "DELETE");
      setToast({ text: "Lesson deleted" });
      router.refresh();
    } catch (e) { setToast({ text: (e as Error).message, err: true }); }
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModule.trim()) return;
    try {
      await post("/api/studio/modules", { courseId: course.id, title: newModule.trim() });
      setNewModule("");
      router.refresh();
    } catch (e2) { setToast({ text: (e2 as Error).message, err: true }); }
  }

  async function togglePublish() {
    try {
      await post("/api/studio/courses", { id: course.id, status: course.status === "published" ? "draft" : "published" });
      router.refresh();
    } catch (e) { setToast({ text: (e as Error).message, err: true }); }
  }

  return (
    <>
      <div className="main-head">
        <div style={{ minWidth: 0 }}>
          <h1>{course.title}</h1>
          <p className="faint" style={{ margin: 0, fontSize: "0.82rem" }} >/{course.slug}</p>
        </div>
        <button className="btn ghost small" onClick={togglePublish}>
          {course.status === "published" ? "Unpublish" : "Publish course"}
        </button>
      </div>
      <div className="curric">
        {modules.map((m, i) => (
          <div className="mod" key={m.id}>
            <div className="mt">
              <h3>{String(i + 1).padStart(2, "0")} · {m.title}</h3>
              <button className="btn ghost small" onClick={() => openDrawer(m.id)}>+ Lesson</button>
            </div>
            {m.lessons.map((l) => (
              <div className="lesson-row" key={l.id}>
                <span className="kind">{l.kind}</span>
                <span className="name">{l.title}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn ghost small" onClick={() => openDrawer(m.id, l)}>Edit</button>
                  <button className="btn ghost small" style={{ color: "var(--danger)" }} onClick={() => removeLesson(l.id)}>Delete</button>
                </span>
              </div>
            ))}
            {m.lessons.length === 0 && <p className="faint" style={{ padding: "12px 24px", margin: 0, fontSize: "0.85rem" }}>Empty module — add the first lesson.</p>}
          </div>
        ))}
      </div>
      <form onSubmit={addModule} style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 340 }} placeholder="New module title" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
        <button className="btn ghost" disabled={!newModule.trim()}>Add module</button>
      </form>

      {drawer && (
        <>
          <div className="drawer-veil" onClick={() => setDrawer(null)} />
          <div className="drawer" role="dialog" aria-label="Lesson editor">
            <h2>{drawer.lesson ? "Edit lesson" : "New lesson"}</h2>
            <div className="field">
              <label htmlFor="lt">Title</label>
              <input id="lt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="lk">Kind</label>
              <select id="lk" className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            {kind === "article" && (
              <div className="field">
                <label htmlFor="lmd">Article body (Markdown)</label>
                <textarea id="lmd" className="input" style={{ minHeight: 260, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }} value={mdBody} onChange={(e) => setMdBody(e.target.value)} />
              </div>
            )}
            {kind === "video" && (
              <div className="field">
                <label htmlFor="lv">Gumlet asset ID</label>
                <input id="lv" className="input mono" placeholder="e.g. 6613f2a1b2c3d4e5f6a7b8c9" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
                <span className="hint">From Gumlet → Video → your asset. Leave blank to show the "video being prepared" state.</span>
              </div>
            )}
            {kind === "pdf" && (
              <div className="field">
                <label htmlFor="lp">PDF URL or path</label>
                <input id="lp" className="input mono" placeholder="/files/az900-cheatsheet.pdf or R2 URL" value={pdfFile} onChange={(e) => setPdfFile(e.target.value)} />
              </div>
            )}
            {kind === "presentation" && (
              <div className="field">
                <label htmlFor="ls">Slide image URLs — one per line, in order</label>
                <textarea id="ls" className="input mono" style={{ minHeight: 160, fontSize: "0.82rem" }} value={slidesText} onChange={(e) => setSlidesText(e.target.value)} />
              </div>
            )}
            {kind === "checkpoint" && (
              <div className="field">
                <label htmlFor="ln">Checkpoint note</label>
                <textarea id="ln" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            {kind === "resource" && (
              <div className="field">
                <label htmlFor="lf">Files — one per line as "name,url"</label>
                <textarea id="lf" className="input mono" style={{ fontSize: "0.82rem" }} value={filesText} onChange={(e) => setFilesText(e.target.value)} />
              </div>
            )}
            <div className="drawer-actions">
              <button className={`btn${busy ? " loading" : ""}`} onClick={saveLesson} disabled={busy || !title.trim()}>Save lesson</button>
              <button className="btn ghost" onClick={() => setDrawer(null)}>Cancel</button>
            </div>
          </div>
        </>
      )}
      {toast && <div className={`toast${toast.err ? " err" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}
