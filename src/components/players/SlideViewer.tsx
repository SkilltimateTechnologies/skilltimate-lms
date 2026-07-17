"use client";
import { useCallback, useEffect, useState } from "react";

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "l" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
);

export default function SlideViewer({ slides }: { slides: string[]; onLast?: () => void }) {
  const [i, setI] = useState(0);
  const last = slides.length - 1;

  const go = useCallback((n: number) => setI(Math.min(Math.max(n, 0), last)), [last]);

  /* ← → arrow keys, plus Home/End — ignored while typing in a field */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setI((v) => Math.min(v + 1, last)); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
      else if (e.key === "Home") { e.preventDefault(); setI(0); }
      else if (e.key === "End") { e.preventDefault(); setI(last); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  if (!slides.length) return <p className="mut">This deck has no slides yet.</p>;

  return (
    <div className="slides">
      <div className="stage">
        <img src={slides[i]} alt={`Slide ${i + 1} of ${slides.length}`} />
        <button className="sarr l" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous slide"><Chevron dir="l" /></button>
        <button className="sarr r" onClick={() => go(i + 1)} disabled={i === last} aria-label="Next slide"><Chevron dir="r" /></button>
      </div>
      <div className="ctl">
        <button className="btn paper-ghost small" onClick={() => go(i - 1)} disabled={i === 0}>← Previous</button>
        <span className="pos">{i + 1} / {slides.length}</span>
        <button className="btn paper-ghost small" onClick={() => go(i + 1)} disabled={i === last}>Next →</button>
        <span className="kbd-hint" style={{ marginLeft: "auto" }}>Navigate with <kbd>←</kbd> <kbd>→</kbd></span>
      </div>
      <div className="thumbs">
        {slides.map((s, n) => (
          <button key={n} className={n === i ? "on" : ""} onClick={() => go(n)} aria-label={`Go to slide ${n + 1}`} aria-current={n === i}>
            <img src={s} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
