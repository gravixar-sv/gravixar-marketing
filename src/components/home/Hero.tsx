import Link from "next/link";
import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";

// Personas the visitor can click into on demo.gravixar.com. Each maps to
// a real seeded persona in the Lattice Studio scene. Clicking sends them
// to the demo's persona-switcher; the demo handles the actual sign-in.
const DEMO_PERSONAS = [
  { name: "Mira", role: "client", color: "from-rose-400/40 to-amber-300/20" },
  { name: "Kai", role: "PM", color: "from-cyan-400/40 to-violet-400/20" },
  { name: "Nox", role: "admin", color: "from-violet-400/40 to-rose-400/20" },
  { name: "Sage", role: "designer", color: "from-emerald-400/40 to-cyan-400/20" },
] as const;

// Live-system signal. Sourced from the actual products: bs-hub modules,
// Beeline modules, scheduled crons, total LOC. Update via the periodic
// product-sync memory rule (feedback_periodic_sync_marketing.md).
const SYSTEM_STATS = [
  { label: "modules in production", value: "16" },
  { label: "modules in private beta", value: "9" },
  { label: "scheduled crons", value: "11" },
  { label: "live cases / demos", value: "4 / 2" },
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
        className="bg-brand-glow ambient-drift pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#0a0a0a]"
      />

      <div className="grid items-start gap-12 md:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] md:gap-14 lg:gap-16">
        {/* Left column, copy + CTAs */}
        <div className="max-w-2xl">
          {meta.eyebrow ? (
            <div className="flex items-center gap-3">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
                {meta.eyebrow}
              </p>
            </div>
          ) : null}
          <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.02em] md:text-5xl lg:text-[3.75rem]">
            {meta.title}
          </h1>
          <div className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
            <MDX source={body} />
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-[#0a0a0a] shadow-lg shadow-brand-deep/20 transition-all hover:bg-brand-soft hover:shadow-xl hover:shadow-brand-deep/30"
            >
              Book a call
            </Link>
            <Link
              href="/work"
              className="group rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
            >
              See what's running
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          {/* Detail strip, what I do, in mono */}
          <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-brand" />
              operations infrastructure
            </span>
            <span className="text-zinc-700">·</span>
            <span>ai tooling</span>
            <span className="text-zinc-700">·</span>
            <span>brand &amp; visuals</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400">this site runs its own ai agents</span>
          </div>
        </div>

        {/* Right column, live-system panel + demo CTA */}
        <DemoPanel />
      </div>
    </section>
  );
}

function DemoPanel() {
  return (
    <aside
      aria-label="demo.gravixar.com, live"
      className="live-panel rounded-xl p-5 backdrop-blur md:mt-1"
    >
      {/* Window-chrome dots + title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
          </span>
          <span className="ml-2 font-mono text-[11px] text-zinc-400">
            demo.gravixar.com
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-sm bg-brand/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
          <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-brand" />
          live
        </span>
      </div>

      {/* Persona grid, clickable into the demo */}
      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          click in as a persona
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_PERSONAS.map((p) => (
            <a
              key={p.name}
              href="https://demo.gravixar.com/lattice"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/40 p-3 transition-colors hover:border-brand/50"
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br ${p.color} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <span className="relative z-10 block text-sm font-medium text-zinc-100">
                {p.name}
              </span>
              <span className="relative z-10 mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                {p.role}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Live system stats */}
      <div className="mt-5 border-t border-zinc-800/80 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          system signal
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {SYSTEM_STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                {s.label}
              </dt>
              <dd className="mt-1 font-mono text-base text-zinc-100">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Footer CTA */}
      <a
        href="https://demo.gravixar.com"
        rel="noreferrer"
        className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-4 text-sm text-zinc-200 transition-colors hover:text-brand-soft"
      >
        <span>open demo full-screen</span>
        <span aria-hidden className="font-mono text-[11px]">↗</span>
      </a>
    </aside>
  );
}
