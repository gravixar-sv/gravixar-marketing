import Link from "next/link";
import { Fragment, ViewTransition } from "react";
import type { Service } from "@/content/schema";
import { Arrow } from "@/components/ui/Button";
import { termsFor } from "./model";

// One service on the /services index as an editorial row, not a card: the
// name and the deal on the left, the promise on the right, the whole row one
// link. Hover is a faint ivory wash plus the underline drawing in under "See
// the details"; nothing lifts, nothing expands, so there is no layout motion.
// No pointer-tracked coral edge: coral marks a decision, not a hover, and a
// lit rounded ring turned the row back into a card.
//
// The title carries the same view-transition name as the detail page's h1
// (svc-{slug}), so opening a row morphs the title into the page heading. A
// name may appear once per page, so only this row carries it.
//
// The label says "details", not "proof": the row opens the service page, where
// the proof sits in the aside, well down the page on a phone. A label should
// promise what the click delivers.
export function ServiceRow({ meta }: { meta: Service }) {
  const terms = termsFor(meta).slice(0, 2);

  return (
    <Link
      href={`/services/${meta.slug}`}
      className="group -mx-4 grid gap-x-10 gap-y-4 rounded-xl px-4 py-8 transition-colors duration-200 md:-mx-6 md:grid-cols-12 md:px-6 md:py-9 [@media(hover:hover)]:hover:bg-ink-50/[0.018]"
    >
      <div className="md:col-span-5">
        <ViewTransition name={`svc-${meta.slug}`} share="morph-title" default="none">
          <h3 className="w-fit text-[1.625rem] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-50 md:text-subsection">
            {meta.title}
          </h3>
        </ViewTransition>
        {/* The deal in two facts: stacked on phones, one line with a quiet
            separator from md, so a wrap can never strand the separator. */}
        {terms.length > 0 ? (
          <p className="mt-3 text-[0.9375rem] leading-snug text-ink-200">
            {terms.map((t, i) => (
              <Fragment key={t.label}>
                {i > 0 ? (
                  <span aria-hidden className="mx-2 hidden text-ink-600 md:inline">
                    /
                  </span>
                ) : null}
                <span className={i > 0 ? "mt-1 block text-ink-400 md:mt-0 md:inline" : undefined}>
                  {t.value}
                </span>
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
      <div className="md:col-span-7 md:pt-1">
        <p className="max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-400 md:text-base">{meta.tagline}</p>
        <p className="mt-4 inline-flex items-center gap-2 text-caption font-medium text-ink-200">
          <span className="link-draw">See the details</span>
          <Arrow />
        </p>
      </div>
    </Link>
  );
}
