import Link from "next/link";
import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { SITE } from "@/lib/seo";
import { StatValue } from "./StatValue";
import systemStats from "../../../content/data/system-stats.json";

// Personas the visitor can click into on demo.gravixar.com. There is no
// sign-in and no persona-switcher: every scene is a stateless playground,
// so a tile just drops the visitor into the scene where that persona sits
// and they can drive any column from there. Mira / Kai / Sage are the three
// Lattice columns (gravixar-demo src/lib/playground/lattice-deliverables.ts
// PERSONAS), Remi Okafor is the founder in the Cockpit scene (same directory,
// cockpit-data.ts FOUNDER). `try` quotes
// the button that persona actually presses, so visitors know what they'll DO
// before they click. Re-confirm against the live scene before editing.
const DEMO_PERSONAS = [
  {
    name: "Mira",
    role: "client",
    try: "approve a deliverable",
    href: "/lattice",
    color: "from-rose-400/40 to-amber-300/20",
  },
  {
    name: "Kai",
    role: "pm",
    try: "approve and send to client",
    href: "/lattice",
    color: "from-cyan-400/40 to-violet-400/20",
  },
  {
    name: "Sage",
    role: "editor",
    try: "submit a draft for review",
    href: "/lattice",
    color: "from-emerald-400/40 to-cyan-400/20",
  },
  {
    name: "Remi",
    role: "founder",
    try: "approve an ai-drafted reply",
    href: "/cockpit",
    color: "from-amber-400/40 to-orange-500/20",
  },
] as const;

// Live-system signal. These used to be hard-coded here with a comment asking a
// human to resync them periodically, which is how "automated jobs" sat at 11
// for months while the real figure reached 17. They now come from
// content/data/system-stats.json, where every entry carries the source it was
// counted from and the date it was verified. The prebuild validator warns past
// 45 days and fails the build past 90, so drift becomes a visible chore instead
// of a quiet lie. Imported, not fetched: no network call at build or runtime,
// so HQ stays strictly outside the critical path.
const SYSTEM_STATS = systemStats.stats;

export function Hero({ meta, body }: { meta: HomeBlock; body: string }) {
  // Padding stays minimal on both ends: the shared marketing layout already
  // pays pt-12/16 above this, under a sticky navbar + demo banner, and the
  // page wrapper's section gap carries the distance down to the mechanism
  // this headline promises.
  return (
    <section className="relative -mx-6 px-6 pb-10 pt-4 md:pb-12 md:pt-6 lg:pt-8">
      {/* Background layers */}
      <div
        aria-hidden
        className="bg-brand-glow pointer-events-none absolute inset-0 -z-10"
      />
      {/* Fade band height tracks the section's bottom padding, any taller and
          the gradient rides up into the copy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-10 bg-gradient-to-b from-transparent to-[#0a0a0a] md:h-12"
      />

      <div className="grid items-start gap-12 md:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] md:gap-14 lg:gap-16">
        {/* Left column, copy + CTAs */}
        <div className="max-w-2xl">
          {meta.eyebrow ? (
            <div className="hero-enter flex items-center gap-3">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
                {meta.eyebrow}
              </p>
            </div>
          ) : null}
          <h1 className="hero-enter mt-5 text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.02em] [animation-delay:80ms] md:text-5xl lg:text-display">
            {meta.title}
          </h1>
          <div className="hero-enter mt-6 max-w-xl text-lg leading-relaxed text-zinc-300 [animation-delay:160ms]">
            <MDX source={body} />
          </div>
          <div className="hero-enter mt-9 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link
              href="/contact"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-[#0a0a0a] shadow-lg shadow-brand-deep/20 transition-all hover:bg-brand-soft hover:shadow-xl hover:shadow-brand-deep/30 active:scale-[0.98]"
            >
              Book a call
            </Link>
            <Link
              href="/work"
              className="group rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-all hover:border-brand hover:text-brand-soft active:scale-[0.98]"
            >
              See what&apos;s running
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          {/* Detail strip, what I do, in mono */}
          <div className="hero-enter mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 [animation-delay:320ms]">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
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
      className="live-panel hero-enter rounded-xl p-5 [animation-delay:200ms] md:mt-1"
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

      {/* Persona grid, live and clickable. Each tile links straight to the
          scene that persona sits in, no sign-in on the way. */}
      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          act as any persona · no sign-in
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_PERSONAS.map((p) => (
            <a
              key={p.name}
              href={`${SITE.demoUrl}${p.href}`}
              rel="noreferrer"
              className="group relative overflow-hidden rounded-md border border-line bg-zinc-950/40 p-3 transition-all hover:-translate-y-0.5 hover:border-brand/50"
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
      <div className="mt-5 border-t border-line-soft pt-4">
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
            <div key={s.key} className="flex flex-col">
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                {s.label}
              </dt>
              <dd className="mt-1 font-mono text-base text-zinc-100">
                <StatValue value={s.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Footer CTA */}
      <a
        href={SITE.demoUrl}
        rel="noreferrer"
        className="group mt-5 flex items-center justify-between border-t border-line-soft pt-4 text-sm text-zinc-200 transition-colors hover:text-brand-soft"
      >
        <span>open the demo</span>
        <span aria-hidden className="font-mono text-[11px] transition-transform group-hover:translate-x-0.5">↗</span>
      </a>
    </aside>
  );
}
