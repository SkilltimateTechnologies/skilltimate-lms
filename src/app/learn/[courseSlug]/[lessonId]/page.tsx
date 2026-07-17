import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { courseBySlug, requireAccess, progressMap, markProgress } from "@/services/courses";
import { md } from "@/lib/md";
import MarkComplete from "@/components/players/MarkComplete";
import SlideViewer from "@/components/players/SlideViewer";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ courseSlug: string; lessonId: string }> }) {
  const { courseSlug, lessonId } = await params;
  const session = await requireUser();
  const data = await courseBySlug(courseSlug);
  if (!data) notFound();
  await requireAccess(session.user, data.course.id);

  const flat = data.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const idx = flat.findIndex((l) => l.id === lessonId);
  if (idx === -1) notFound();
  const lesson = flat[idx];
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  // opening a lesson marks it started (completion stays sticky)
  await markProgress(session.user, lesson.id, "started");
  const pm = await progressMap(session.user.id, [lesson.id]);
  const done = pm.get(lesson.id)?.status === "completed";
  const c = lesson.content as Record<string, any>;
  const nextHref = next ? `/learn/${courseSlug}/${next.id}` : null;

  return (
    <>
      <div className="main-head" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p className="faint" style={{ margin: 0, fontSize: "0.8rem" }}>
            <Link href={`/learn/${courseSlug}`} className="mut">{data.course.certCode}</Link>
            {" · "}{lesson.moduleTitle}
          </p>
          <h1 style={{ marginTop: 4 }}>{lesson.title}</h1>
        </div>
        <span className="kind tag" style={{ flexShrink: 0 }}>{lesson.kind}</span>
      </div>

      {lesson.kind === "article" && (
        <div className="paper">
          <div className="prose" dangerouslySetInnerHTML={{ __html: md(c.md || "") }} />
        </div>
      )}

      {lesson.kind === "video" &&
        (c.asset_id ? (
          <iframe
            className="video-frame"
            src={`https://play.gumlet.io/embed/${c.asset_id}`}
            title={lesson.title}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ border: "1px solid var(--line-soft)" }}
          />
        ) : (
          <div className="video-pending">
            <strong style={{ color: "var(--ink-mute)" }}>Video is being prepared</strong>
            <span style={{ fontSize: "0.85rem" }}>This lesson's recording is queued for upload to the streaming server. Continue with the rest of the module — this page will show the player as soon as the video lands.</span>
          </div>
        ))}

      {lesson.kind === "presentation" && (
        <div className="paper">
          <SlideViewer slides={(c.slides as string[]) || []} />
        </div>
      )}

      {lesson.kind === "pdf" && (
        <div className="paper" style={{ padding: 16 }}>
          <iframe className="pdf-frame" src={c.file || ""} title={lesson.title} />
          <p className="mut" style={{ margin: "12px 0 0", fontSize: "0.85rem" }}>
            Viewer not loading on your device? <a href={c.file} target="_blank" rel="noreferrer">Open the PDF directly</a>.
          </p>
        </div>
      )}

      {lesson.kind === "resource" && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Downloads</h3>
          {((c.files as { name: string; url: string }[]) || []).map((f) => (
            <p key={f.url} style={{ margin: "8px 0" }}>
              <a href={f.url} target="_blank" rel="noreferrer">↓ {f.name}</a>
            </p>
          ))}
        </div>
      )}

      {lesson.kind === "checkpoint" && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Checkpoint</h3>
          <p className="mut">{c.note || "Head to Mock exams to test this module before moving on."}</p>
          <Link href="/learn/exams" className="btn small">Open mock exams</Link>
        </div>
      )}

      <MarkComplete lessonId={lesson.id} done={done} nextHref={nextHref} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        {prev ? <Link className="mut" href={`/learn/${courseSlug}/${prev.id}`}>← {prev.title}</Link> : <span />}
        {next ? <Link className="mut" href={`/learn/${courseSlug}/${next.id}`}>{next.title} →</Link> : <span />}
      </div>
    </>
  );
}
