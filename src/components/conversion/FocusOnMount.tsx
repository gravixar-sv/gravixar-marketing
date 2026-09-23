"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Wraps whatever replaces a form once it sends (a FormSuccess, a booking
// confirmation). The form the visitor was typing into has just unmounted, so
// without this their focus falls back to <body> and a screen reader announces
// nothing; on a phone the confirmation can also sit off-screen above the
// point where the submit button used to be. Focusing the wrapper fixes both:
// it is announced (the child carries role=status) and focus() scrolls it into
// view.
//
// tabIndex=-1 makes it programmatically focusable without adding a tab stop.
// The global :focus-visible ring is left alone on purpose: if the visitor
// submitted with the keyboard, the ring shows where they now are.
export function FocusOnMount({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    // Only scroll when the panel is actually out of view, and never smoothly
    // for readers who asked for less motion.
    const r = el.getBoundingClientRect();
    if (r.top < 64 || r.bottom > window.innerHeight) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  }, []);
  return (
    <div ref={ref} tabIndex={-1} className={cn("rounded-xl", className)}>
      {children}
    </div>
  );
}
