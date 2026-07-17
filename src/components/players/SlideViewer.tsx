"use client";
import { useState } from "react";

export default function SlideViewer({ slides, onLast }: { slides: string[]; onLast?: () => void }) {
  const [i, setI] = useState(0);
  const last = slides.length - 1;
  function go(n: number) {
    const next = Math.min(Math.max(n, 0), last);
    setI(next);
  }
  if (!slides.length) return <p className="mut">This deck has no slides yet.</p>;
  return (
    <div className="slides">
      <div className="stage"><img src={slides[i]} alt={`Slide ${i + 1} of ${slides.length}`} /></div>
      <div className="ctl">
        <button className="btn paper-ghost small" onClick={() => go(i - 1)} disabled={i === 0}>← Prev</button>
        <span className="pos">{i + 1} / {slides.length}</span>
        <button className="btn paper-ghost small" onClick={() => go(i + 1)} disabled={i === last}>Next →</button>
      </div>
      <div className="thumbs">
        {slides.map((s, n) => (
          <button key={n} className={n === i ? "on" : ""} onClick={() => go(n)} aria-label={`Go to slide ${n + 1}`}>
            <img src={s} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
