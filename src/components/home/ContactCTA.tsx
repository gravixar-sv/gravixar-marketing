"use client";

import Link from "next/link";
import { useRef } from "react";

// Closing CTA panel. The static corner glow is the base layer; on
// pointer devices a second radial glow tracks the cursor (direct DOM
// write, no re-render). If scripting never runs, the panel still reads
// exactly as before, the tracked glow simply stays at opacity 0.
export function ContactCTA() {
  const panelRef = useRef<HTMLElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <section
      ref={panelRef}
      onMouseMove={onMouseMove}
      className="live-panel group relative overflow-hidden rounded-2xl p-10 md:p-14"
    >
      {/* Subtle ambient gradient */}
      <div
        aria-hidden
        className="bg-brand-glow pointer-events-none absolute inset-0 -z-0 opacity-60"
      />
      {/* Cursor-tracked glow, hover-gated so touch devices never pay for it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 107, 53, 0.09), transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
          next step
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.015em] md:text-section">
          Bring me a real operations problem. I&apos;ll show you the system before
          you sign anything.
        </h2>
        <p className="mt-4 max-w-2xl text-zinc-400">
          30-minute discovery call. If we&apos;re not a fit, you walk with notes
          you can use anyway.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-brand-deep/20 transition-all hover:bg-brand-soft hover:shadow-xl hover:shadow-brand-deep/30 active:scale-[0.98]"
          >
            Book a call
          </Link>
          <Link
            href="/work"
            className="group/link rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-all hover:border-brand hover:text-brand-soft active:scale-[0.98]"
          >
            Read what I&apos;ve shipped
            <span className="ml-1 inline-block transition-transform group-hover/link:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
