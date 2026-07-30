import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import {
  fitsInsideCell,
  KIND_LABELS,
  OriginChip,
} from "@/components/site/GraphicsMeta";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { loadGraphics } from "@/content/loaders";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Brand and visual work, a capability showcase",
  description:
    "Identity, interface, motion, web, and print work, with every piece labeled as client work, self-directed, or concept. What I can build in visual systems, shown built.",
  path: "/graphics",
});

export default async function GraphicsIndexPage() {
  const items = await loadGraphics();
  // Grid cells the lineup occupies, where a featured piece takes two. Read by
  // the trailing-orphan rule further down.
  const cells = items.reduce((n, i) => n + (i.meta.featured ? 2 : 1), 0);
  return (
    <div className="space-y-16">
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Graphics", url: `${SITE.url}/graphics` },
        ]}
      />
      {/* This page is a capability showcase, not a client-work portfolio. A
          portfolio makes the implicit claim "a client hired me for this", which
          own-brand work cannot make honestly. A showcase makes a different one,
          "I can build this, and here it is built", which is the claim a buyer
          needs answered before commissioning visual work. The origin label on
          every card is what keeps the two apart. */}
      <PageHeader
        eyebrow="capability showcase"
        title="Visual work, labeled for what it is."
        lede="A capability showcase, not a client roster. Every piece says where it came from: client work, self-directed work on one of my own brands, or a concept. The list is short today and grows as client work clears."
      />

      {items.length === 0 ? (
        // Still reachable: a draft-only or cleared-out state renders here. An
        // empty state that only says "coming soon" is a dead end, so it names
        // why the showcase is thin and hands the reader the two pages that do
        // carry the work today.
        <Reveal className="reveal-quiet">
          <div className="card-surface rounded-xl p-8 md:p-10">
            <p className="text-lg text-zinc-200">
              Nothing published in the showcase yet.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-zinc-400">
              The brand and visual work sits inside the builds it was made for.
              This page fills in as pieces get cut loose from those builds, each
              one labeled for what it is.
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
        <div>
          {/* Counted from the loader, so the page cannot oversell itself as the
              list grows or thins. */}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            <p>
              {items.length} {items.length === 1 ? "piece" : "pieces"} published
            </p>
            <p>origin labeled on every piece</p>
          </div>

          {/* Two columns, and a featured piece leads full width. Same shape as
              DemoGrid on the homepage: it gives the lineup a hierarchy and
              breaks the orphan half-row an odd count leaves behind. The span
              and the crop are literal class strings, never interpolated, because
              Tailwind v4 generates utilities by scanning source text and an
              interpolated class name compiles to nothing.

              A featured piece eats two of the two columns, so featuring one in a
              list of two would leave the second card sitting alone in a half
              cell. Count the cells first and let a trailing odd one widen, so a
              row always fills. Width and rank are separate: widening an orphan
              gives it the cell, not the featured piece's heading size. */}
          <Reveal>
            <div className="reveal-stagger mt-5 grid gap-5 md:grid-cols-2">
              {items.map((g, i) => {
                const featured = g.meta.featured;
                const wide =
                  featured || (cells % 2 === 1 && i === items.length - 1);
                // A cover is either a wide capture or a mark. object-cover on a
                // square mark crops the mark, so the asset decides its own fit
                // from the width and height its frontmatter already declares.
                // Same call Clients.tsx makes for the logo marquee.
                const fitInside = fitsInsideCell(g.meta.cover);
                return (
                  <Link
                    key={g.meta.slug}
                    href={`/graphics/${g.meta.slug}`}
                    className={`card-surface card-hover-glow group block overflow-hidden rounded-xl active:scale-[0.99] ${
                      wide ? "md:col-span-2" : ""
                    }`}
                  >
                    <div
                      className={`relative overflow-hidden border-b border-line-soft bg-zinc-900 ${
                        wide ? "aspect-[16/9]" : "aspect-[4/3]"
                      }`}
                    >
                      <Image
                        src={g.meta.cover.src}
                        alt={g.meta.cover.alt}
                        fill
                        sizes={
                          wide
                            ? "(min-width: 768px) 1152px, 100vw"
                            : "(min-width: 768px) 50vw, 100vw"
                        }
                        className={`transition-transform duration-500 ease-out group-hover:scale-[1.02] ${
                          fitInside
                            ? "object-contain p-10 md:p-16"
                            : "object-cover"
                        }`}
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                          {KIND_LABELS[g.meta.kind]} · {g.meta.year}
                        </p>
                        <OriginChip origin={g.meta.origin} />
                      </div>
                      <h2
                        className={`mt-3 font-semibold tracking-[-0.015em] text-zinc-100 ${
                          featured ? "text-xl md:text-2xl" : "text-lg"
                        }`}
                      >
                        {g.meta.title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                        {g.meta.summary}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </div>
      )}

      <ContactCTA />
    </div>
  );
}
