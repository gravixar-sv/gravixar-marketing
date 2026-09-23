import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { SetFigure } from "@/components/site/SetFigure";
import { EarlyAccessForm } from "@/components/lead/EarlyAccessForm";
import { PageLight } from "@/components/conversion/PageLight";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { buildMetadata, SITE } from "@/lib/seo";
import { cn } from "@/lib/cn";
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
//
// It also used to say that four times (the h1, a 63-word lede, a note under
// the numbers, and the closing panel). It now says it once in the header and
// once in the closing panel, and the middle of the page is the list and the
// evidence.

export const metadata: Metadata = buildMetadata({
  title: "Early access to the module library",
  description:
    "The modules work today inside real builds. A monthly plan you can rent does not exist yet. Join the list to hear when it does.",
  path: "/early-access",
});

// The evidence column reads the same validated file the homepage reads
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

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Three properties of the library, not three steps, so they are ruled rows
// rather than numbered cards. Written for the person who runs an agency, not
// for a developer: "private package", "entry" and "build" were the builder's
// words for the same facts (one shared copy, a page per module, the projects
// it runs in).
const HOW_THE_LIBRARY_WORKS = [
  {
    title: "One copy of each building block",
    body: "Each shared building block is kept in one place, not copied into every new project and left to drift. When I fix it, the fix reaches every project that uses it.",
  },
  {
    title: "You can read it before you talk to me",
    body: "Each module page says what it does, what it is built with, and which live projects use it today. You don't need a call to work out whether it fits your problem.",
  },
  {
    title: "A person approves before anything changes",
    body: "The AI drafts, a person decides. That rule holds in every system I build, and it will hold in anything I host for you later. No 3am surprises, and nothing published without a yes.",
  },
] as const;

export default function EarlyAccessPage() {
  return (
    <div className="relative isolate">
      <PageLight />
      <PageHeader
        eyebrow="Early access"
        title="Everything here works today."
        accent="You can't buy it off the shelf yet."
        // Two sentences, two lines: the serif tail starts its own line.
        accentBreak
        // Plain words first. About's "Join the list" link arrives here from
        // the phrase "building blocks", so the lede picks up that phrase and
        // only then gives it the name the rest of the page uses.
        lede="The building blocks are real. I call them modules, and each one in the library has its own page that names the live projects it runs in. What does not exist yet is a monthly plan you can rent, and I won't give a date I can't keep."
      />

      <div className="mt-12 grid gap-16 md:mt-16 lg:grid-cols-12 lg:gap-16">
        <section aria-labelledby="join-title" className="min-w-0 lg:col-span-7">
          <h2 id="join-title" className="text-reference font-semibold text-ink-50">
            Join the list
          </h2>
          <p className="mt-2 max-w-[52ch] text-ink-400">
            One email when a module is ready to use on its own. No newsletter, no follow-up
            sequence, and your address goes nowhere else.
          </p>
          <div className="mt-8">
            <EarlyAccessForm />
          </div>
        </section>

        {/* Evidence. This slot used to hold indicative price bands for the
            unbuilt platform, which was the page's fastest-aging claim:
            invented numbers attached to an invented date. It now holds counts
            that can be checked. Each cell is value-first (flex-col-reverse,
            so the <dt> still leads for a screen reader), which pins both
            numbers to the same line even when one label wraps.
            The two numbers are set in type. From lg this column sits beside
            the form, and by the layout's arithmetic the numbers sit about 700
            to 750px down at 1440x900, inside the first viewport, so they set
            on arrival, after the lede (220ms). Below lg the column stacks
            under the form, well below the fold, so there they set as they
            scroll in instead. */}
        <aside aria-labelledby="exists-title" className="min-w-0 lg:col-span-5 lg:pt-1.5">
          {/* A label-sized h2, so it opts out of the global h1/h2 display
              treatment (94% width, -0.03em), which only suits large sizes. */}
          <h2 id="exists-title" className="text-sm font-medium tracking-normal text-ink-200 [font-stretch:100%]">
            What exists today
          </h2>
          <dl className="mt-4 grid grid-cols-2 border-y border-line">
            {LIBRARY_STATS.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  "flex flex-col-reverse justify-end py-6",
                  i > 0 ? "border-l border-line-soft pl-6" : "pr-6",
                )}
              >
                <dt className="mt-3 text-caption text-ink-400">{sentence(s.label)}</dt>
                <dd className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink-50 tabular-nums md:text-[3.25rem]">
                  <SetFigure text={s.value} trigger="arrival" scrollBelow="lg" delay={440 + i * 140} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-caption text-ink-400">
            Counted from my list of modules, not projected from a roadmap.
          </p>
          {COUNTED_AT ? (
            <p className="mt-1.5 font-mono text-label-sm text-ink-500">
              counted {COUNTED_AT}
            </p>
          ) : null}
        </aside>
      </div>

      <section aria-labelledby="how-title" className="mt-24 md:mt-32">
        <h2 id="how-title" className="text-section font-semibold text-ink-50">
          How the library works
        </h2>
        <Reveal className="reveal-quiet mt-10">
          <ul className="reveal-stagger border-t border-line">
            {HOW_THE_LIBRARY_WORKS.map((row) => (
              <li
                key={row.title}
                className="grid gap-3 border-b border-line py-7 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-12 md:py-9"
              >
                <h3 className="text-reference font-semibold text-ink-100">{row.title}</h3>
                <p className="max-w-[58ch] text-ink-400 md:pt-0.5">{row.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* What you can do now. Was "while you wait", which only makes sense
          under a launch this page no longer claims.
          NO CORAL HERE. "Join the list" is this page's one decision, so the
          library is a ghost button and the demo and the call are quiet links:
          a second coral button this far down pulled readers off the list the
          page exists for.
          The panel is capped at the width its words need (h2 at 22ch, body at
          56ch). Full width, the right half of a lit panel sat empty. */}
      <Reveal className="mt-24 md:mt-32">
        <section
          aria-labelledby="now-title"
          className="panel-lit relative isolate overflow-hidden rounded-3xl px-6 py-10 sm:p-10 md:max-w-3xl md:p-14"
        >
          <div aria-hidden className="ember-rise pointer-events-none absolute inset-0 -z-10" />
          <h2 id="now-title" className="max-w-[22ch] text-section font-semibold text-ink-50">
            You can read the library and try the demo today.
          </h2>
          <p className="mt-4 max-w-[56ch] text-ink-300">
            Each module has its own page. The demo site lets you click through working versions on
            sample data, and nothing you do is saved. Look at both, then decide if it fits before
            you book a call.
          </p>
          <div className="mt-8 flex flex-col gap-x-6 gap-y-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/modules" className={cn("group", buttonClass({ variant: "ghost" }))}>
              See the module library <Arrow />
            </Link>
            <a
              href={SITE.demoUrl}
              rel="noreferrer"
              className="group inline-flex min-h-11 items-center justify-center gap-2 text-sm text-ink-200 transition-colors hover:text-ink-50 sm:justify-start"
            >
              <span className="link-draw">Try the demo</span>
              <Arrow external />
            </a>
            <Link
              href="/contact"
              className="group inline-flex min-h-11 items-center justify-center text-sm text-ink-300 transition-colors hover:text-ink-50 sm:justify-start"
            >
              <span className="link-draw">Or book a 30-minute call</span>
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
