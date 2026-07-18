"use client";

import { useEffect, useRef, useState } from "react";

// Rolls a stat up from zero the first time it scrolls into view. The
// server renders the final value, so with scripting off (or reduced
// motion) the real number is simply there; the roll-up is enhancement.
// Handles compound values like "9 / 5" by animating each digit run.
export function StatValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const segments = value.split(/(\d+)/);
    if (!segments.some((s) => /^\d+$/.test(s))) return;

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(
            segments
              .map((s) =>
                /^\d+$/.test(s) ? String(Math.round(Number(s) * eased)) : s,
              )
              .join(""),
          );
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
