"use client";
import { useEffect, useState } from "react";

/* One tasteful burst on exam pass. Respects prefers-reduced-motion. */
export default function PassBurst({ xpNote }: { xpNote: string }) {
  const [pieces, setPieces] = useState<{ left: number; delay: number; hue: number; drift: number; spin: number }[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(Array.from({ length: 36 }, () => ({
      left: 8 + Math.random() * 84,
      delay: Math.random() * 350,
      hue: [244, 248, 152, 65][Math.floor(Math.random() * 4)],
      drift: (Math.random() - 0.5) * 120,
      spin: 360 + Math.random() * 540,
    })));
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <p className="xp-note">{xpNote}</p>
      {pieces.length > 0 && (
        <div className="confetti" aria-hidden="true">
          {pieces.map((p, i) => (
            <i key={i} style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}ms`,
              ["--hue" as never]: p.hue,
              ["--drift" as never]: `${p.drift}px`,
              ["--spin" as never]: `${p.spin}deg`,
            }} />
          ))}
        </div>
      )}
    </>
  );
}
