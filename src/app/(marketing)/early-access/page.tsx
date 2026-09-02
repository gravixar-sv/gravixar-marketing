import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { EarlyAccessForm } from "@/components/lead/EarlyAccessForm";
import { buildMetadata } from "@/lib/seo";
import systemStats from "../../../../content/data/system-stats.json";

// This page used to sell a hosted platform: three monthly price bands, a
// "we host it for you" step, and "private beta opening soon". None of that
// was datable, and content/modules/shared-core-package.mdx says the opposite
// outright, that the library is a private versioned package and "nothing here
// is sold or installed by a client". A page promising a subscription the rest
// of the site says does not exist gets less true every month it sits there.
// So the promise is gone and the page now sells the thing that is real: a
// library of modules already running inside builds, and a list you join to
// hear when one of them becomes something you can run yourself. If a hosted
// account ever ships, add it here with a date that can be held. Not before.

export const metadata: Metadata = buildMetadata({
  title: "Early access to the module library",
  description:
    "Modules from the library run in production inside real builds today. A hosted account where you rent one by the month does not exist yet. Join the list to hear when it does.",
  path: "/early-access",
});

// The right-hand column reads the same validated file the homepage reads
// rather than numbers typed into this component. Every entry in
// content/data/system-stats.json carries the source it was counted from, and
// the prebuild validator warns past 45 days and fails past 90, so this column
// cannot quietly rot into the stale claim the page just stopped making.
// Only the two registry figures belong here; the job and engagement counters
// answer a different question and live on the homepage.
const LIBRARY_STAT_KEYS: readonly string[] = ["modules-built", "modules-reused"];
const LIBRARY_STATS = systemStats.stats.filter((s) =>
  LIBRARY_STAT_KEYS.includes(s.key),
);
// Oldest verifiedAt across the two, so the printed date can only understate
// how fresh the count is.
const COUNTED_AT = LIBRARY_STATS.map((s) => s.verifiedAt).sort()[0];

const HOW_THE_LIBRARY_WORKS = [
  {
    n: "01",
    title: "One copy of each module",
    body: "A reused module is a version in a private package, not a folder copied into the next repo and left to drift. A fix lands once and reaches every build that depends on it.",
  },
  {
    n: "02",
    title: "You can read it before you talk to me",
    body: "Every entry names what it does, the stack under it, and the builds it runs inside today. No discovery call required to work out whether the shape fits your problem.",
  },
  {
    n: "03",
    title: "A human approves every write",
    body: "The AI parts draft, a person approves. That rule holds in the custom builds and it holds in anything hosted later. No 3am surprises, no auto-published garbage.",
  },
] as const;

export default function EarlyAccessPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="early access"
        title="Everything here runs in production. None of it is a product you can buy yet."
        lede="The module library is real: each entry names the build it runs inside and how it works. What does not exist is a hosted account where you rent one by the month. I am working toward it, and I will not print a date I cannot hold. Join the list and you hear from me when there is something you can actually run."
      />

      <section className="grid gap-12 lg:grid-cols-12">
        {/* Form column */}
        <div className="lg:col-span-7">
          <h2 className="font-mono text-label uppercase text-brand">
            join the list
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            One email when a module becomes something you can run yourself. No
            drip sequence, no marketing list, no sharing your address with
            anyone.
          </p>
          <div className="mt-6">
            <EarlyAccessForm />
          </div>
        </div>

        {/* Evidence column. This slot used to hold indicative price bands for
            the unbuilt platform, which was the page's fastest-aging claim:
            invented numbers attached to an invented date. It now holds counts
            that can be checked. */}
        <aside className="lg:col-span-5">
          <h2 className="font-mono text-label uppercase text-brand">
            what exists today
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Counted from the module registry, not projected from a roadmap.
          </p>
          <div className="mt-6 rounded-xl border border-line bg-zinc-950/40 p-5">
            <dl className="grid grid-cols-2 gap-4">
              {LIBRARY_STATS.map((s) => (
                <div key={s.key} className="flex flex-col">
                  <dt className="font-mono text-label-sm uppercase text-zinc-400">
                    {s.label}
                  </dt>
                  <dd className="mt-1 font-mono text-xl text-zinc-100">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
            {COUNTED_AT ? (
              <p className="mt-4 border-t border-line-soft pt-3 font-mono text-label-sm uppercase text-zinc-400">
                counted {COUNTED_AT}
              </p>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-zinc-400">
            No price list here, because there is nothing priced to sell. Today a
            module reaches you inside a build, and a build starts with a
            conversation about what you already have.
          </p>
          <p className="mt-4 font-mono text-label-sm uppercase text-zinc-400">
            want one in your own build? <Link href="/contact" className="text-brand-soft underline-offset-4 hover:underline">book a call →</Link>
          </p>
        </aside>
      </section>

      {/* How the library works */}
      <section>
        <h2 className="font-mono text-label uppercase text-brand">
          how the library works
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {HOW_THE_LIBRARY_WORKS.map((step) => (
            <div
              key={step.n}
              className="card-surface rounded-2xl p-6"
            >
              <p className="font-mono text-label-sm uppercase text-muted">
                {step.n}
              </p>
              <h3 className="mt-3 text-lg font-medium tracking-[-0.01em] text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What you can do now. Was "while you wait", which only makes sense
          under a launch this page no longer claims. */}
      <section className="rounded-2xl border border-line bg-zinc-950/40 p-8 md:p-10">
        <h2 className="font-mono text-label uppercase text-brand">
          what you can do now
        </h2>
        <h3 className="mt-3 max-w-3xl text-2xl font-medium tracking-[-0.015em] md:text-3xl">
          The library is readable today, and the demo is runnable today.
        </h3>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Each module has a page naming what it does and where it runs. The demo
          site holds sandboxes of the same patterns with nothing saved. Read
          one, run the other, then decide whether the shape fits before you
          spend an hour on a call.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/modules"
            className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
          >
            See the module library →
          </Link>
          <Link
            href="/contact"
            className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
          >
            Book a custom-build call →
          </Link>
        </div>
      </section>
    </div>
  );
}
