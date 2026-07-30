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
import { GraphicsCardPreview } from "@/components/site/GraphicsCardPreview";
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

// Packs the lineup into the two-column grid below and returns, per item in
// render order, whether it takes the whole row.
//
// This has to be a walk, not a sum. A md:col-span-2 element CANNOT sit in the
// leftover second column of an open row: the browser pushes it to a fresh one
// and leaves that cell empty. So the column a card lands in depends on every
// card before it, and no aggregate over the lineup can see that. The version
// this replaced counted weighted cells (featured = 2) and widened the last
// card when the total was odd, which agreed with reality only while the
// featured piece happened to lead: with [plain, featured, plain] the total is
// 4, nothing widened, and the page rendered a hole beside card 1 and stranded
// card 3 in a half cell, which is the exact orphan the rule existed to stop.
//
// Rules, in the order the browser applies them:
//   featured     always full width, so it always starts a fresh row. Any open
//                row is closed behind it, second cell empty.
//   plain        takes one column and advances.
//   plain, last, and landing at the start of a row  would sit alone in a half
//                cell with nothing behind it to fill the other one, so it gets
//                the whole row instead. Width is not rank: the heading size
//                further down still comes from `featured` alone.
//
// A plain card is stranded at BOTH ends of the lineup, not just the trailing
// one. It is alone in its row if it lands at col 0 and nothing can sit beside
// it, which happens when it is last OR when the next card is featured, since a
// featured card always starts a fresh row. Widening only the trailing case left
// a hole beside card 1 for [N,F] and [N,F,N], and [N,F] is the reachable one:
// it needs nothing more than a plain entry ordered above the featured piece.
//
// Widening a plain card does NOT promote it. A featured card is 16/9 and fills
// the row as the lead; a widened plain card takes the same width at 21/9, a
// short band that reads as a filler rather than a second lead. Width closes the
// hole, aspect keeps the rank. That pairing is what makes it safe to widen a
// plain card sitting directly above a featured one.
function packRows(
  items: { meta: { featured: boolean } }[],
): boolean[] {
  const wide: boolean[] = [];
  let col = 0; // 0 = at the start of a row, 1 = second cell of an open row
  items.forEach((item, i) => {
    if (item.meta.featured) {
      wide.push(true);
      col = 0;
      return;
    }
    const alone =
      col === 0 &&
      (i === items.length - 1 || items[i + 1]?.meta.featured === true);
    wide.push(alone);
    col = alone ? 0 : (col + 1) % 2;
  });
  return wide;
}

export default async function GraphicsIndexPage() {
  const items = await loadGraphics();
  const rowSpans = packRows(items);
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
              breaks the orphan half-row an odd count leaves behind. Which cards
              widen comes from packRows above, which places them the way the
              browser will. The span and the crop are literal class strings,
              never interpolated, because Tailwind v4 generates utilities by
              scanning source text and an interpolated class name compiles to
              nothing at all. */}
          <Reveal>
            <div className="reveal-stagger mt-5 grid gap-5 md:grid-cols-2">
              {items.map((g, i) => {
                const featured = g.meta.featured;
                const wide = rowSpans[i] ?? featured;
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
                      // Three aspects, not two, because width alone would make
                      // a widened plain card look like a second lead. Featured
                      // is the tall 16/9 band; a plain card widened only to
                      // close a hole takes 21/9, the same width at half the
                      // height, so the row fills without the rank moving.
                      // Literal strings: an interpolated class is never
                      // generated by Tailwind's source scan.
                      className={`relative overflow-hidden border-b border-line-soft bg-zinc-900 ${
                        featured
                          ? "aspect-[16/9]"
                          : wide
                            ? "aspect-[21/9]"
                            : "aspect-[4/3]"
                      }`}
                    >
                      {/* A piece whose subject is motion gets to move here.
                          The preview swaps the cover image for a muted loop
                          that starts itself once the card is on screen and
                          never runs for a reader who asked for reduced motion.
                          It degrades to the same frame either way: the poster
                          is server-rendered, so the still cover is what a card
                          shows before, and instead of, anything playing. */}
                      {g.meta.preview ? (
                        <GraphicsCardPreview
                          src={g.meta.preview.src}
                          poster={g.meta.preview.poster}
                          label={g.meta.cover.alt}
                          className={`transition-transform duration-500 ease-out group-hover:scale-[1.02] ${
                            fitInside
                              ? "object-contain p-10 md:p-16"
                              : "object-cover"
                          }`}
                        />
                      ) : (
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
                      )}
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
