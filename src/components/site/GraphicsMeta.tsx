import type { GraphicsItem } from "@/content/schema";

// Display labels + the provenance chip for /graphics. Both the index and the
// detail route render the same three facts (kind, year, origin), so the maps
// live here once rather than drifting in two copies.
//
// Both maps are keyed off the schema types, not off `string`, so widening
// either enum without adding a label is a type error rather than a raw enum
// value leaking into the page. Same guard the /modules CATEGORY_LABELS map
// wants and does not have.

export const KIND_LABELS: Record<GraphicsItem["kind"], string> = {
  identity: "brand identity",
  interface: "product interface",
  motion: "motion design",
  web: "web build",
  print: "print and deck",
};

// Provenance, rendered as a category and not as a caveat. The three do carry
// different evidential weight, and showing that is the honest move: a client
// commission is someone else betting money on the work, self-directed work
// proves the capability without that bet, a concept proves neither. Weight is
// carried by text and border brightness only.
//
// No coral in here. Coral marks a section start or a pointer state on this
// site, and a provenance label is neither.
const ORIGIN: Record<
  GraphicsItem["origin"],
  { label: string; className: string }
> = {
  client: {
    label: "client commission",
    className: "border-zinc-500/70 bg-zinc-800/70 text-zinc-100",
  },
  "self-directed": {
    label: "self-directed, own brand",
    className: "border-line bg-zinc-900/70 text-zinc-300",
  },
  concept: {
    label: "concept, unbuilt",
    className: "border-line-soft text-zinc-500",
  },
};

// Does this asset need fitting inside its cell rather than filling it?
// Filling with object-cover is right for a wide capture (a screenshot, a scene
// still) and wrong at BOTH extremes. Too tall and the sides get cut; too wide
// and the ends do, which is the worse failure because a wordmark cropped to its
// middle third is unreadable and the reader cannot tell it was ever a word.
// The bound is deliberately two-sided: the first version tested only ratio < 1.2
// and rendered a 4.06:1 wordmark as three letters. 2.2 sits above every real
// screen capture on the site (the demo scenes are 2.17:1, the scene stills
// 1.78:1) and below any lockup that reads as a horizontal mark.
// width and height are optional in frontmatter, so an undeclared asset keeps the
// fill default rather than getting letterboxed by a guess.
export function fitsInsideCell(img: {
  width?: number;
  height?: number;
}): boolean {
  if (!img.width || !img.height) return false;
  const ratio = img.width / img.height;
  return ratio < 1.2 || ratio > 2.2;
}

export function OriginChip({ origin }: { origin: GraphicsItem["origin"] }) {
  const { label, className } = ORIGIN[origin];
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${className}`}
    >
      {label}
    </span>
  );
}
