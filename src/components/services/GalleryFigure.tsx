import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import type { GraphicsItem } from "@/content/schema";
import { fitsInsideCell } from "@/components/site/GraphicsMeta";
import { Arrow } from "@/components/ui/Button";

// One published /graphics piece shown inside a service article, in the same
// frame as the demo screenshots. Brand & Visuals was the only design page with
// no picture on it, while its first paragraph tells the reader to look at the
// work instead of reading about it. Placed by an MDX comment,
// {/* gallery-shot */}, like the other figures (see splitAtMarkers in ./body).
//
// It shows existing work only, with that piece's own cover and alt text, and
// links to the piece. Nothing here makes a claim the gallery does not already
// make. The page loads the piece with loadGraphics, so a piece that is renamed
// or unpublished drops the figure instead of rendering a broken frame.
type Placement = { piece: string; label: string };

const PIECES: Record<string, Placement> = {
  "brand-visuals": { piece: "gravixar-identity", label: "See the identity system" },
};

export function galleryPlacementFor(slug: string): Placement | undefined {
  return PIECES[slug];
}

export function GalleryFigure({ piece, label }: { piece: GraphicsItem; label: string }) {
  const href = `/graphics/${piece.slug}`;
  // A mark is contained with room around it, never cropped; a photographic
  // cover fills the frame. Same test and the same bands as /graphics, so the
  // frame keeps its proportions when it morphs into the piece's own cover.
  const contain = fitsInsideCell(piece.cover);

  return (
    <Link href={href} className="group my-12 block rounded-2xl">
      <figure>
        <ViewTransition name={`gfx-${piece.slug}`} share="morph-media" default="none">
          <div className="frame-lit relative rounded-2xl p-1.5">
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-2xl border border-ink-50/20 opacity-0 transition-opacity duration-[420ms] ease-out group-focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:duration-200"
            />
            <div
              className={`relative overflow-hidden rounded-[10px] bg-ink-950 ${
                contain ? "aspect-[4/3] sm:aspect-[21/9]" : "aspect-[16/10]"
              }`}
            >
              <Image
                src={piece.cover.src}
                alt={piece.cover.alt}
                fill
                sizes="(min-width: 768px) 640px, 100vw"
                className={contain ? "object-contain p-12 sm:p-10" : "object-cover"}
              />
            </div>
          </div>
        </ViewTransition>
        <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1">
          <span className="font-mono text-xs text-ink-500">{href}</span>
          <span className="inline-flex items-center gap-2 text-caption text-ink-300 transition-colors group-hover:text-ink-50 group-focus-visible:text-ink-50">
            <span className="link-draw group-focus-visible:[background-size:100%_1px]">
              {label}
            </span>
            <Arrow />
          </span>
        </figcaption>
      </figure>
    </Link>
  );
}
