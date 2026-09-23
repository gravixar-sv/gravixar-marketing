"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Pointer-tracked light for a GRID of cards. One listener per grid, one rAF per
// frame: it reads every card rect, then writes every --spot-x / --spot-y, so
// there is no read/write interleaving and no layout thrash. The CSS in
// globals.css (.card-hover-glow) turns those two numbers into an edge light:
// the hovered card fills with a faint wash, its neighbours catch coral on their
// near edges, and the whole band reads as one lit surface.
//
// Touch and coarse pointers never attach the listener. Without JS the cards
// simply fall back to a lit top edge on hover/focus, a correct static state.
export function SpotlightGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".card-hover-glow"));
      const rects = cards.map((c) => c.getBoundingClientRect());
      cards.forEach((c, i) => {
        const r = rects[i];
        if (!r) return;
        c.style.setProperty("--spot-x", `${x - r.left}px`);
        c.style.setProperty("--spot-y", `${y - r.top}px`);
      });
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    root.addEventListener("pointermove", move, { passive: true });
    return () => {
      root.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} data-spot-group className={className}>
      {children}
    </div>
  );
}
