import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ViewTransition } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import {
  fitsInsideCell,
  kindLabel,
  OriginChip,
} from "@/components/site/GraphicsMeta";
import { GraphicsCardPreview } from "@/components/site/GraphicsCardPreview";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { loadGraphics, type Loaded } from "@/content/loaders";
import type { GraphicsItem } from "@/content/schema";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Brand and visual work, a capability showcase",
  description:
    "Identity, interface, motion, web and print, every piece labeled client work, self-directed or concept. What I build in visual systems, shown built.",
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
  const leadOut = rowSpans[0] === true;
  const offset = leadOut ? 1 : 0;
  const rest = items.slice(offset);
  return (
    <div>
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
        eyebrow="Capability showcase"
        title="Visual work, labeled for what it is."
        lede="Not a client list. Each piece says where it came from: work for a client, work for one of my own brands, or a concept. The list is short for now and grows as client work is cleared to show."
      >
        {items.length > 0 ? (
          // Counted from the loader, so the page cannot oversell itself as the
          // list grows or thins. The old second phrase ("origin labeled on
          // every piece") said the headline a third time.
          <p className="text-caption text-ink-500">
            {items.length} {items.length === 1 ? "piece" : "pieces"} published
          </p>
        ) : null}
      </PageHeader>

      {items.length === 0 ? (
        // Still reachable: a draft-only or cleared-out state renders here. An
        // empty state that only says "coming soon" is a dead end, so it names
        // why the showcase is thin and hands the reader the two pages that do
        // carry the work today.
        <Reveal className="reveal-quiet mt-12">
          <div className="card-surface rounded-2xl p-8 md:p-10">
            <p className="text-lg text-ink-200">
              Nothing published in the showcase yet.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-400">
              The brand and visual work sits inside the builds it was made for.
              This page fills in as pieces get cut loose from those builds, each
              one labeled for what it is.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[0.9375rem]">
              <Link href="/services/brand-visuals" className="link-quiet">
                The brand and visuals service
              </Link>
              <Link href="/work" className="link-quiet">
                Case studies
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        // Two columns, and a featured piece leads full width. Which cards
        // widen comes from packRows above, which places them the way the
        // browser will. The span and the crop are literal class strings,
        // never interpolated, because Tailwind v4 generates utilities by
        // scanning source text and an interpolated class name compiles to
        // nothing at all.
        //
        // The media sits in a lit product frame (.frame-lit) and the words sit
        // on the ground below it, not inside a second box. The frame carries a
        // shared-element name, so the cover grows into the detail page's lead
        // media on navigation instead of the page cross-fading.
        //
        // A lead card that fills its own row sits OUTSIDE the <Reveal>: it is
        // in the fold and its cover is the LCP candidate, so it must never
        // render part-faded while a scroll timeline waits for the reader.
        // Splitting after a full-width row cannot disturb packRows, because
        // that row closes (col is back at 0) before the next card is placed.
        <>
          {leadOut && items[0] ? (
            <div className="mt-12 grid md:mt-16 md:grid-cols-2">
              <GraphicsCard g={items[0]} wide priority />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <Reveal className={leadOut ? "mt-14 md:mt-20" : "mt-12 md:mt-16"}>
              <div className="reveal-stagger grid gap-x-6 gap-y-14 md:grid-cols-2">
                {rest.map((g, j) => (
                  <GraphicsCard
                    key={g.meta.slug}
                    g={g}
                    wide={rowSpans[j + offset] ?? g.meta.featured}
                  />
                ))}
              </div>
            </Reveal>
          ) : null}
        </>
      )}

      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}

// One showcase card: the cover in a lit frame, the words on the ground below.
function GraphicsCard({
  g,
  wide,
  priority = false,
}: {
  g: Loaded<GraphicsItem>;
  wide: boolean;
  priority?: boolean;
}) {
  const featured = g.meta.featured;
  // A cover is either a wide capture or a mark. object-cover on a
  // square mark crops the mark, so the asset decides its own fit
  // from the width and height its frontmatter already declares.
  const fitInside = fitsInsideCell(g.meta.cover);
  const mediaClass = `transition-transform duration-700 ease-out-expo group-hover:scale-[1.02] ${
    fitInside ? "object-contain p-10 md:p-16" : "object-cover"
  }`;
  return (
    <Link
      href={`/graphics/${g.meta.slug}`}
      className={`group block ${wide ? "md:col-span-2" : ""}`}
    >
      <ViewTransition name={`gfx-${g.meta.slug}`} share="morph-media" default="none">
        <div
          // Three aspects, not two, because width alone would make
          // a widened plain card look like a second lead. Featured
          // is the tall 16/9 band; a plain card widened only to
          // close a hole takes 21/9, the same width at half the
          // height, so the row fills without the rank moving.
          className={`frame-lit relative overflow-hidden rounded-2xl ${
            featured
              ? "aspect-[16/9]"
              : wide
                ? "aspect-[4/3] md:aspect-[21/9]"
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
              className={mediaClass}
            />
          ) : (
            <Image
              src={g.meta.cover.src}
              alt={g.meta.cover.alt}
              fill
              sizes={
                wide
                  ? "(min-width: 768px) 1104px, 100vw"
                  : "(min-width: 768px) 540px, 100vw"
              }
              priority={priority}
              className={mediaClass}
            />
          )}
        </div>
      </ViewTransition>
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-caption text-ink-500">
            {kindLabel(g.meta.kind)} · {g.meta.year}
          </p>
          <OriginChip origin={g.meta.origin} />
        </div>
        <h2
          className={`mt-2.5 max-w-[34ch] font-semibold text-ink-100 transition-colors group-hover:text-ink-50 ${
            featured ? "text-subsection" : "text-reference"
          }`}
        >
          {g.meta.title}
        </h2>
        <p className="mt-2.5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-400">
          {g.meta.summary}
        </p>
      </div>
    </Link>
  );
}
