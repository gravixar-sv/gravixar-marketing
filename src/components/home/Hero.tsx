import Link from "next/link";
import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";

// What visitors will be able to do once demo.gravixar.com goes live.
// Each bullet maps to a real flow in the bs-hub fork that powers the demo.
const PREVIEW_FLOWS = [
  "log in as Casey, an active client",
  "flip into admin view, approve a deliverable",
  "watch the AI intake wizard run end-to-end",
  "trigger the daily security-watch cron",
] as const;

export function Hero({ meta, body }: { meta: HomeBlock; body: string }) {
  return (
    <section className="relative -mx-6 px-6 pb-24 pt-10 md:pt-16 lg:pt-20">
      {/* Background layers */}
      <div
        aria-hidden
        className="bg-dot-grid pointer-events-none absolute inset-0 -z-10 opacity-50"
      />
      <div
        aria-hidden
        className="bg-brand-glow pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#0a0a0a]"
      />

      <div className="grid items-start gap-12 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:gap-14 lg:gap-16">
        {/* Left column, copy + CTAs */}
        <div className="max-w-2xl">
          {meta.eyebrow ? (
            <div className="flex items-center gap-3">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-brand" />
              <p className="font-mono text-xs uppercase tracking-widest text-brand">
                {meta.eyebrow}
              </p>
            </div>
          ) : null}
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {meta.title}
          </h1>
          <div className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
            <MDX source={body} />
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-[#0a0a0a] shadow-lg shadow-brand-deep/20 transition-colors hover:bg-brand-soft"
            >
              Book a call
            </Link>
            <a
              href="https://demo.gravixar.com"
              rel="noreferrer"
              className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
            >
              Preview the demo →
            </a>
          </div>

          {/* Detail strip, what I do, in mono */}
          <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              operations infrastructure
            </span>
            <span className="text-zinc-700">·</span>
            <span>ai tooling</span>
            <span className="text-zinc-700">·</span>
            <span>brand &amp; visuals</span>
            <span className="text-zinc-700">·</span>
            <span>this site runs its own ai agents</span>
          </div>
        </div>

        {/* Right column, demo preview panel */}
        <DemoPreview />
      </div>
    </section>
  );
}

function DemoPreview() {
  return (
    <aside
      aria-label="demo.gravixar.com, coming online"
      className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 p-6 font-mono text-xs shadow-2xl shadow-black/40 backdrop-blur md:mt-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <span className="flex items-center gap-2 text-zinc-200">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-brand" />
          <span className="text-sm">demo.gravixar.com</span>
        </span>
        <span className="rounded-sm bg-brand/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-brand">
          coming online
        </span>
      </div>

      {/* Body, what you'll do */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">
          what you&apos;ll do
        </p>
        <ul className="mt-3 space-y-3">
          {PREVIEW_FLOWS.map((flow, i) => (
            <li key={flow} className="flex gap-3">
              <span className="select-none text-brand-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-zinc-300">{flow}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer CTA */}
      <Link
        href="/contact"
        className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4 text-zinc-200 transition-colors hover:text-brand-soft"
      >
        <span>notify me when it&apos;s live</span>
        <span aria-hidden>→</span>
      </Link>
    </aside>
  );
}
