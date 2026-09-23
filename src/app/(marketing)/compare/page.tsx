import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import { Arrow } from "@/components/ui/Button";
import { loadCompares } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Off-the-shelf vs custom, honest comparisons",
  description:
    "Productive.io, Function Point, Karbon, Notion, monday.com. Where each one wins, where each one breaks, and when a custom portal is worth what it costs.",
  path: "/compare",
});

// An editorial index, not a card grid: one full-width row per tool, the tool's
// name set large on the left as the thing a reader scans for, the argument on
// the right. Five rows never leave an orphaned half-row, which the two-column
// grid did at any odd count.
export default async function CompareIndexPage() {
  const items = await loadCompares();
  return (
    <div>
      <PageHeader
        eyebrow="Comparisons"
        title="Off-the-shelf vs custom, honestly."
        lede="I'll tell you when the tool you already pay for is the right answer. I'll also tell you when your business has outgrown it. Each page below says where that line sits."
      />

      <Reveal className="reveal-quiet mt-4 md:mt-8">
        <ol className="reveal-stagger">
          {items.map((c) => (
            <li key={c.meta.slug} className="group border-b border-line-soft transition-colors hover:border-line">
              <Link
                href={`/compare/${c.meta.slug}`}
                className="grid gap-x-12 gap-y-3 py-9 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-12"
              >
                {/* The name is a scanning aid, repeated in the title beside it,
                    so assistive tech hears it once. On a phone the two would
                    stack and say the same thing twice, so it starts at md. */}
                <p
                  aria-hidden
                  className="hidden text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink-300 transition-colors [font-stretch:94%] group-hover:text-ink-50 md:block"
                >
                  {c.meta.competitor}
                </p>
                <div className="min-w-0">
                  <h2 className="max-w-[46ch] text-reference font-semibold text-ink-100">
                    {c.meta.title}
                  </h2>
                  <p className="mt-3 line-clamp-4 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-400 md:line-clamp-none">
                    {c.meta.summary}
                  </p>
                  <p className="mt-5 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-200 transition-colors group-hover:text-ink-50">
                    Read the comparison <Arrow />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Reveal>

      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}
