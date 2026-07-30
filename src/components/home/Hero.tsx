import Link from "next/link";
import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { SITE } from "@/lib/seo";
import { ApprovalStrip } from "./ApprovalStrip";
import { StatValue } from "./StatValue";
import systemStats from "../../../content/data/system-stats.json";

// Live-system signal. These used to be hard-coded here with a comment asking a
// human to resync them periodically, which is how "automated jobs" sat at 11
// for months while the real figure reached 17. They now come from
// content/data/system-stats.json, where every entry carries the source it was
// counted from and the date it was verified. The prebuild validator warns past
// 45 days and fails the build past 90, so drift becomes a visible chore instead
// of a quiet lie. Imported, not fetched: no network call at build or runtime,
// so HQ stays strictly outside the critical path.
const SYSTEM_STATS = systemStats.stats;

// The oldest verifiedAt across the stats, printed beside them. The label here
// used to read "weekly reset · sun 03:00 utc", which described the demo's reset
// cron sitting above numbers that have nothing to do with the demo, and which
// contradicted the demo's own "nothing is saved" line. These figures are counted
// from the ops platform, so the honest label is when they were last counted, and
// taking the oldest means the date can only understate the freshness.
const COUNTED_AT = SYSTEM_STATS.map((s) => s.verifiedAt).sort()[0];

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

      {/* The loop itself, runnable. This slot used to hold a persona grid that
          described what a visitor could do in the demo; it now does one of those
          things here, on the fold that claims the AI asks before it acts. The
          only client component in this panel besides <StatValue>, and for the
          same reason: it server-renders its resolved state and enhances on
          mount, so it cannot cost the fold anything if scripting never runs.
          See ApprovalStrip.tsx for the full rationale. */}
      <ApprovalStrip />

      {/* Live system stats */}
      <div className="mt-5 border-t border-line-soft pt-4">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            system signal
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            counted {COUNTED_AT}
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
