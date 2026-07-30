import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { loadGraphics } from "@/content/loaders";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Brand and Visual Systems, Motion and Identity",
  description:
    "Visual identity, motion, and brand work for Gravixar and clients: logos, design systems, and the visuals that ship with every build.",
  path: "/graphics",
});

export default async function GraphicsIndexPage() {
  const items = await loadGraphics();
  return (
    <div className="space-y-16">
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Graphics", url: `${SITE.url}/graphics` },
        ]}
      />
      <PageHeader
        eyebrow="graphics"
        title="Visual identity, motion, brand work."
        lede="Pick what speaks to you. The work itself is the brief."
      />

      {items.length === 0 ? (
        // Empty until content/graphics/ lands. An empty state that only says
        // "coming soon" is a dead end, so it names why the gallery is thin and
        // hands the reader the two pages that do carry the work today.
        <Reveal className="reveal-quiet">
          <div className="card-surface rounded-xl p-8 md:p-10">
            <p className="text-lg text-zinc-200">
              Nothing published in the gallery yet.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-zinc-400">
              The brand and visual work sits inside the builds it was made for
              rather than in a standalone gallery. This page fills in as pieces
              are cut loose from their builds.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              <Link
                href="/services/brand-visuals"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition-colors hover:text-brand"
              >
                Brand and visuals, the scope →
              </Link>
              <Link
                href="/work"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition-colors hover:text-brand"
              >
                Case studies →
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="reveal-stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((g) => (
              <Link
                key={g.meta.slug}
                href={`/graphics/${g.meta.slug}`}
                className="card-surface card-hover-glow group block overflow-hidden rounded-xl active:scale-[0.99]"
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-line-soft bg-zinc-900">
                  <Image
                    src={g.meta.cover.src}
                    alt={g.meta.cover.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                    {g.meta.kind} · {g.meta.year}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-zinc-100">
                    {g.meta.title}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      <ContactCTA />
    </div>
  );
}
