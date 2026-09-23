import Link from "next/link";
import { ViewTransition } from "react";
import { Arrow } from "@/components/ui/Button";
import type { CaseStudy } from "@/content/schema";
import { CaseCover } from "./CaseCover";
import { keepCompounds } from "./model";

// The end of a study hands the reader to the next one (by curated order,
// wrapping at the end) instead of dead-ending into the closing CTA. The next
// title carries its own morph name, so clicking it glides the title up into
// the next page's h1. A quiet "All work" link sits beside the label.
export function NextStudy({ next }: { next: CaseStudy }) {
  return (
    <nav aria-label="Next case study" className="mt-24 border-t border-line pt-8 md:mt-32 md:pt-10">
      <div className="flex items-baseline justify-between gap-6">
        <p className="text-caption text-ink-400">Next case study</p>
        <Link href="/work" className="-my-3 py-3 text-caption text-ink-300 link-quiet">
          All work
        </Link>
      </div>
      <Link href={`/work/${next.slug}`} className="group mt-6 grid gap-8 md:grid-cols-12 md:items-center md:gap-10">
        <div className="md:col-span-7 lg:col-span-8">
          <ViewTransition name={`case-${next.slug}`} share="morph-title" default="none">
            <h2 className="max-w-[24ch] text-section font-semibold text-ink-50">{keepCompounds(next.title)}</h2>
          </ViewTransition>
          <p className="mt-4 text-caption text-ink-400">{keepCompounds(next.client)}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-100">
            <span className="link-draw">Read the case study</span>
            <Arrow />
          </span>
        </div>
        <div className="hidden md:col-span-5 md:block lg:col-span-4">
          <CaseCover slug={next.slug} variant="thumb" />
        </div>
      </Link>
    </nav>
  );
}
