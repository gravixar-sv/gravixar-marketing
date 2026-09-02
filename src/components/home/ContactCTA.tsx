"use client";

import Link from "next/link";
import { useRef } from "react";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

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
        <p className="font-mono text-label uppercase text-brand">
          next step
        </p>
        {/* pretty, not the global balance: this is two sentences over three
            lines, where balance chases equal line widths and breaks mid-clause.
            pretty keeps the natural rag and only fixes the orphan. */}
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.015em] [text-wrap:pretty] md:text-section">
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
            className={buttonClass()}
          >
            Book a call
          </Link>
          <Link
            href="/work"
            className={cn("group/link", buttonClass({ variant: "ghost" }))}
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
