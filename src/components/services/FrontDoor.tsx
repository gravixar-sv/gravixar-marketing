import Link from "next/link";
import { ViewTransition } from "react";
import type { Service } from "@/content/schema";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { leadFigure, termsFor, TRACK_LABEL } from "./model";

// The front door on /services: the fixed-price first step, set apart from the
// menu instead of sitting in it as one more card. Left, the promise and the one
// primary action on the page; right, across a hairline, the price as a number
// and what it covers.
//
// The three "covers" lines are phrases from the pricing line itself, checked
// against it at render: if the pricing is reworded and a phrase no longer
// appears, the block falls back to the first three deliverables instead of
// saying something the page no longer says.
const COVERS: Record<string, string[]> = {
  "ops-leak-audit": [
    "one team and the workflows that cost it the most",
    "a written report and a call to walk you through it",
    "no hourly billing, no open-ended discovery",
  ],
};

function coversFor(meta: Service): string[] {
  const pricing = (meta.pricing ?? "").toLowerCase();
  const mapped = COVERS[meta.slug];
  const lines =
    mapped && mapped.every((p) => pricing.includes(p)) ? mapped : meta.deliverables.slice(0, 3);
  return lines.map((l) => l.charAt(0).toUpperCase() + l.slice(1));
}

export function FrontDoor({ meta }: { meta: Service }) {
  const href = `/services/${meta.slug}`;
  const lead = leadFigure(meta);
  const terms = termsFor(meta);

  return (
    <section
      aria-labelledby="front-door"
      className="hero-enter panel-lit relative overflow-hidden rounded-2xl [animation-delay:380ms]"
    >
      <div aria-hidden className="ember-horizon pointer-events-none absolute inset-0" />
      {/* Three grid children so phones can read in buying order: the promise,
          then the price and what it covers, then the button. From md the
          button returns under the promise (row 2 of the left column) and the
          deal spans both rows on the right. Row 2 is 1fr so any extra height
          from the deal column lands below the button, never between the
          promise and the button. */}
      <div className="relative grid gap-y-9 p-6 py-8 sm:p-8 md:grid-cols-12 md:grid-rows-[auto_1fr] md:gap-0 md:p-12">
        <div className="md:col-span-7 md:pr-12">
          <p className="text-caption text-ink-400">{TRACK_LABEL[meta.track]}</p>
          <ViewTransition name={`svc-${meta.slug}`} share="morph-title" default="none">
            <h2 id="front-door" className="mt-3 w-fit text-section font-semibold text-ink-50">
              {meta.title}
            </h2>
          </ViewTransition>
          <p className="mt-4 max-w-[44ch] text-lead text-ink-300">{meta.tagline}</p>
        </div>

        <div className="order-last md:order-none md:col-span-7 md:row-start-2 md:pr-12 md:pt-8">
          <Link href={href} className={cn(buttonClass(), "group w-full sm:w-auto")}>
            Start with the audit
            <Arrow />
          </Link>
        </div>

        <div className="md:col-span-5 md:col-start-8 md:row-span-2 md:row-start-1 md:border-l md:border-line md:pl-12">
          {lead ? (
            <p className="flex items-baseline gap-2.5">
              <span className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink-50 [font-stretch:94%] md:text-[3.25rem]">
                {lead.figure}
              </span>
              {lead.qualifier ? <span className="text-[0.9375rem] text-ink-300">{lead.qualifier}</span> : null}
            </p>
          ) : terms[0] ? (
            <p className="text-reference font-semibold text-ink-50">{terms[0].value}</p>
          ) : null}
          <ul className="mt-6 border-t border-line">
            {coversFor(meta).map((c) => (
              <li key={c} className="border-b border-line-soft py-3 text-[0.9375rem] leading-normal text-ink-200">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
