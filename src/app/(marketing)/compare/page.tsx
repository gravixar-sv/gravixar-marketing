import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { loadCompares } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Off-the-shelf vs custom, honest comparisons",
  description:
    "Productive.io, Function Point, Karbon, Notion, monday.com. Where each one wins, where each one breaks, and when a custom portal is the cheaper long-term call.",
  path: "/compare",
});

export default async function CompareIndexPage() {
  const items = await loadCompares();
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="comparisons"
        title="Off-the-shelf vs custom, honestly."
        lede="I'll tell you when the SaaS is the right answer. I'll also tell you when a custom build wins on cost and shape over twelve months. No pretending the trade-offs don't exist."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((c) => (
          <Link
            key={c.meta.slug}
            href={`/compare/${c.meta.slug}`}
            className="card-surface card-hover-glow group rounded-xl p-6"
          >
            <p className="font-mono text-label-sm uppercase text-muted group-hover:text-brand">
              {c.meta.competitor} vs custom
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.015em] text-zinc-100 md:text-2xl">
              {c.meta.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {c.meta.summary}
            </p>
            <p className="mt-4 font-mono text-label-sm uppercase text-zinc-400 group-hover:text-brand">
              {c.meta.category}
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </Link>
        ))}
      </div>
      <ContactCTA />
    </div>
  );
}
