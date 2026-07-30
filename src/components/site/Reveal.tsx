"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Reveals its children once, when they scroll into view: a fade + rise. GPU-only
// (opacity + transform). Honors prefers-reduced-motion via the .reveal CSS in
// globals.css.
//
// FALLBACK PATH ONLY. Where `animation-timeline: view()` exists (Chrome, Edge,
// Safari 26), globals.css drives the reveal entirely in CSS and data-revealed is
// inert, so this observer and its rescue timer set an attribute no rule reads.
// That is the point: on those engines base visibility no longer depends on
// hydration at all. This component is what Firefox (still flag-gated as of
// mid-2026) and older Safari get.
//
// `delay` writes an inline transitionDelay and is therefore also fallback-only,
// since delays mean nothing on a progress timeline. No call site uses it today.
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    // Rescue: if the element sits in the viewport but the observer never
    // fired (throttled/frozen contexts), force the reveal. Base visibility
    // must not depend on observer callbacks running.
    const rescue = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) setRevealed(true);
    }, 1400);
    return () => {
      io.disconnect();
      window.clearTimeout(rescue);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-revealed={revealed}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
