import Image from "next/image";
import Link from "next/link";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import styles from "./ContactCTA.module.css";

// The closing ask, on most pages of the site. A statement panel with light
// rising from its bottom edge (the next step is forward), the grain laid back
// over that light, and the person you would actually work with.
//
// No pointer-tracked glow any more. It measured the panel on every mousemove
// with no frame throttle, and a closing panel does not need to follow the
// cursor to be read. That also makes this a server component again.
//
// THE SIZE (`size`). On the homepage this panel is an act opener like the
// others there, so it takes the statement rank (size="statement"). Everywhere
// else it closes an inner page under a text-page h1, where the section rank is
// the right weight, so that stays the default. No ad-hoc sizes at call sites.
//
// THE SERIF TAIL (`voice`). Each page gets at most one phrase in the serif
// human voice. The closing line is a good home for it on an inner page whose
// header is plain, so it is on by default. A page that already spends its
// serif phrase elsewhere passes voice={false}: the homepage does (the hero h1
// carries it), and so must any page whose PageHeader sets `accent`. With the
// serif off, the same words render as the muted half of a two-tone statement,
// so the sentence never changes, only its register.
//
// THE PERSON (`person`). A one-operator business should show the operator at
// the moment it asks for the call. From md the portrait is a real figure
// beside the ask, top-aligned with the headline and dissolving into the panel
// at its foot; on phones it is a small face above the headline, so the panel
// still ends on the buttons. /about already leads with the full portrait, so
// that page passes person={false}.
//
// THE BUTTON LABEL is "Start with the audit", the same words as the primary
// button on /services and on the homepage's offer: one action, one label.
//
// The non-breaking space keeps "I" from being stranded at the end of a line,
// which the two-tone version did on phones.
const TAIL = "I\u00a0will show you the system running before you sign anything.";

export function ContactCTA({
  voice = true,
  person = true,
  size = "section",
}: {
  voice?: boolean;
  person?: boolean;
  size?: "section" | "statement";
}) {
  return (
    <section
      aria-labelledby="closing-cta"
      className="panel-lit relative isolate overflow-hidden rounded-3xl p-6 py-10 sm:p-10 md:p-14 lg:p-16"
    >
      <div aria-hidden className="ember-rise pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className={cn(styles.grain, "pointer-events-none absolute inset-0 -z-10")} />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-14 lg:gap-16">
        <div>
          {/* pretty, not the global balance: two sentences over three or four
              lines, where balance chases equal widths and breaks mid-clause. */}
          <h2
            id="closing-cta"
            className={cn(
              "text-ink-50 [text-wrap:pretty]",
              size === "statement" ? "max-w-[22ch] text-statement" : "max-w-[24ch] text-section",
            )}
          >
            Bring me a real operations problem.{" "}
            {voice ? (
              <em className="voice text-ink-200">{TAIL}</em>
            ) : (
              <span className="text-ink-500">{TAIL}</span>
            )}
          </h2>
          <p className="mt-6 max-w-[56ch] text-ink-300">
            The Ops Leak Audit is the fixed-price first step: I count the hours
            your tools cost your team, then price the fix. Rather talk first?
            Book a <span className="whitespace-nowrap">30-minute</span> call. If it
            is not a fit, you still leave with notes you can use.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/services/ops-leak-audit" className={cn(buttonClass(), "group w-full sm:w-auto")}>
              Start with the audit
              <Arrow />
            </Link>
            <Link href="/contact" className={cn(buttonClass({ variant: "ghost" }), "w-full sm:w-auto")}>
              Book a call
            </Link>
          </div>
        </div>

        {person ? (
          <figure className="order-first flex items-center gap-4 md:order-none md:w-[200px] md:flex-col md:items-stretch md:gap-3 lg:w-[232px]">
            <div className={cn(styles.frame, "relative size-16 shrink-0 overflow-hidden rounded-2xl bg-ink-900 md:aspect-[4/5] md:size-auto md:w-full")}>
              <Image
                src="/about/qamar.jpg"
                alt="Portrait of Qamar"
                fill
                sizes="(min-width: 1024px) 232px, (min-width: 768px) 200px, 64px"
                className={cn(styles.portrait, "object-cover")}
              />
              <span aria-hidden className={cn(styles.warm, "absolute inset-0")} />
              <span aria-hidden className={cn(styles.vignette, "absolute inset-0")} />
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line-strong),inset_0_1px_0_rgb(255_255_255/0.08)]"
              />
            </div>
            <figcaption className="max-w-[18ch] text-caption text-balance text-ink-400 md:max-w-none">
              Qamar, the person you would work with
            </figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
