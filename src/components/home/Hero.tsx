import Link from "next/link";
import { MDX } from "@/content/mdx";
import type { HomeBlock } from "@/content/schema";
import { SITE } from "@/lib/seo";
import { StatValue } from "./StatValue";

// The gate a visitor holds in each live scene, with the button label
// quoted verbatim from that scene so the promise resolves the moment
// they land. Five rows, one per scene, deliberately repetitive: it is
// the same approval loop on five different desks, which is the point.
//
// This replaced a "click in as a persona" grid of four tiles (Mira /
// Kai / Nox / Sage) that all linked to /lattice. The demo has no
// persona switcher, no sign-in, and no Nox; the tiles promised an
// identity fork that was removed in demo PR #14. Re-confirm each label
// against the live scene before editing.
const DEMO_GATES = [
  { action: "Approve & send to client", scene: "Agency OS", slug: "lattice" },
  { action: "Approve & publish", scene: "Agent Console", slug: "studio-mix" },
  { action: "Approve & send", scene: "Founder Cockpit", slug: "cockpit" },
  { action: "Request change", scene: "Brand Guardian", slug: "northbeam" },
  { action: "Approve billing", scene: "Billing & Credentialing", slug: "care-ledger" },
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
            <div className="hero-enter flex items-center gap-3">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
                {meta.eyebrow}
              </p>
            </div>
          ) : null}
          <h1 className="hero-enter mt-5 text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.02em] [animation-delay:80ms] md:text-5xl lg:text-[3.75rem]">
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
      className="live-panel hero-enter rounded-xl p-5 backdrop-blur [animation-delay:200ms] md:mt-1"
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

      {/* The gates, on hairlines rather than tiles: five near-identical
          rows are the argument (one loop, five desks), and a card grid
          would fight the demo grid further down the page. */}
      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          the same gate, five desks
        </p>
        <ul className="mt-2 divide-y divide-zinc-800/70 border-t border-zinc-800/70">
          {DEMO_GATES.map((g) => (
            <li key={g.slug}>
              <a
                href={`${SITE.demoUrl}/${g.slug}`}
                rel="noreferrer"
                className="group flex items-baseline justify-between gap-3 py-2 transition-transform duration-150 active:scale-[0.98]"
              >
                <span className="link-draw text-[13px] leading-snug text-zinc-200 group-hover:text-brand-soft">
                  {g.action}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  {g.scene}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Live system stats */}
      <div className="mt-5 border-t border-zinc-800/80 pt-4">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            system signal
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            sample data, nothing saved
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {SYSTEM_STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
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
        className="group mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-4 text-sm text-zinc-200 transition-colors hover:text-brand-soft"
      >
        <span>open the demo</span>
        <span aria-hidden className="font-mono text-[11px] transition-transform group-hover:translate-x-0.5">↗</span>
      </a>
    </aside>
  );
}
