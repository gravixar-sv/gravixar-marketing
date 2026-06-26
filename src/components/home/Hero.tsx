import Link from "next/link";
import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { SITE } from "@/lib/seo";

// Personas the visitor can click into on demo.gravixar.com. Each maps to
// a real seeded persona in the Lattice Studio scene. Clicking sends them
// to the demo's persona-switcher; the demo handles the actual sign-in.
// `try` is the closed-loop action visible on each persona's page on the
// demo, so visitors know what they'll DO before they click.
const DEMO_PERSONAS = [
  {
    name: "Mira",
    role: "client",
    try: "approve a deliverable",
    color: "from-rose-400/40 to-amber-300/20",
  },
  {
    name: "Kai",
    role: "pm",
    try: "send first reply on an inquiry",
    color: "from-cyan-400/40 to-violet-400/20",
  },
  {
    name: "Nox",
    role: "admin",
    try: "approve leave + see audit log",
    color: "from-violet-400/40 to-rose-400/20",
  },
  {
    name: "Sage",
    role: "designer",
    try: "submit a draft for client",
    color: "from-emerald-400/40 to-cyan-400/20",
  },
] as const;

// Live-system signal. Every figure traces to canonical ground truth:
//   modules built (24) + reused (13 = 5 shared + 8 extract verdicts)
//     → brain _meta/module-health.json summary.{total, byVerdict}
//   automated jobs (11) → HQ's 5 Vercel crons + 6 scheduled GitHub Actions
//     (HQ-scoped on purpose, not a fleet-wide claim)
//   demos (5) → live scenes on demo.gravixar.com (Care Ledger went live
//     2026-06-26, joining Lattice, Studio Mix, Driftwood, Northbeam)
//   engagements (9) → 7 published case studies + 2 managed-services retainers
// Resync against canonical status on a cadence
// (feedback_periodic_sync_marketing.md).
const SYSTEM_STATS = [
  { label: "modules built", value: "24" },
  { label: "reused across products", value: "13" },
  { label: "automated jobs in HQ", value: "11" },
  { label: "engagements / demos", value: "9 / 5" },
] as const;

export function Hero({ meta, body }: { meta: HomeBlock; body: string }) {
  return (
    <section className="relative -mx-6 px-6 pb-24 pt-10 md:pt-16 lg:pt-20">
      {/* Background layers */}
      <div
        aria-hidden
        className="bg-brand-glow pointer-events-none absolute inset-0 -z-10"
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
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
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
              See what&apos;s running
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
        <span className="flex items-center gap-1.5 rounded-sm bg-emerald-950/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300">
          <span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />
          live
        </span>
      </div>

      {/* Persona grid — live and clickable. Lattice personas link
          via the identity-fork entry so visitors pick their context. */}
      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          click in as a persona
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_PERSONAS.map((p) => (
            <a
              key={p.name}
              href={`${SITE.demoUrl}/lattice`}
              rel="noreferrer"
              className="group relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/40 p-3 transition-all hover:-translate-y-0.5 hover:border-brand/50"
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br ${p.color} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <span className="relative z-10 flex items-baseline justify-between gap-1">
                <span className="block text-sm font-medium text-zinc-100">
                  {p.name}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500 group-hover:text-brand">
                  {p.role}
                </span>
              </span>
              <span className="relative z-10 mt-2 block text-[11px] leading-tight text-zinc-400 group-hover:text-zinc-200">
                try · {p.try}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Live system stats */}
      <div className="mt-5 border-t border-zinc-800/80 pt-4">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            system signal
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            weekly reset · sun 03:00 utc
          </p>
        </div>
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
        href={SITE.demoUrl}
        rel="noreferrer"
        className="group mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-4 text-sm text-zinc-200 transition-colors hover:text-brand-soft"
      >
        <span>open the demo</span>
        <span aria-hidden className="font-mono text-[11px] transition-transform group-hover:translate-x-0.5">↗</span>
      </a>
    </aside>
  );
}
