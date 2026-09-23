import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { DEMO_SCENES, type CropBox } from "@/lib/demos";
import { SITE } from "@/lib/seo";
import latticeShot from "./shots/lattice-2x.png";
import studioMixShot from "./shots/studio-mix-2x.png";

// A real screenshot of the matching demo, shown inside a service article where
// the prose invites the reader to try it. Operations Infrastructure opened by
// saying "try the Lattice demo" and then showed none of it. Placed by an MDX
// comment, {/* demo-shot */}, so the article decides where the picture sits
// (see splitAtMarkers in ./body).
//
// THE PIXELS ARE LOCAL, AT 2x. The shared captures in /public/scenes are 1x
// (1600x738), and a 388px phone crop of them rendered about 1.8x upscaled on a
// 2x phone: card titles and the Approve buttons went soft. ./shots holds only
// the region each figure shows, captured from the live demo at 1600x738 CSS
// and deviceScaleFactor 2 (so every box below is in the same 1x coordinates
// as demos.ts, doubled in the file), with the demo's pulsing hint ring parked
// in its invisible phase to match the shared captures. A figure owns its boxes
// and its pixels together, so a re-capture of /public/scenes can never slide a
// box off these files. The scene's name, brand and address still come from
// demos.ts. Re-capture ./shots when the demo has a visual pass.
//
// The caption's action label is local too: demos.ts's labels are written for
// /demos, where "Open the OS" sits under the scene's own name. Here it is read
// by an owner who has not seen that name, so it says what the click does.
//
// A figure with no wide box shows its phone crop at every width, capped near
// the crop's own width so it is never stretched across the reading column.
// Studio Mix is that case: its wide box was half the empty output pane ("No
// run yet"), a picture of nothing on the page that argues a person approves.
// The agents column alone (Echo: "Lands in review, never auto-published")
// makes the point. When a capture with a draft waiting for approval exists,
// give it a wide box again.
//
// The frame is a link to the live scene. Hover brightens its edge and draws
// the caption's underline; nothing lifts, so the column never shifts.

type Figure = {
  scene: string;
  shot: StaticImageData;
  /** The region ./shots holds, in 1x CSS pixels. Boxes are relative to it. */
  region: { w: number; h: number };
  narrow: CropBox;
  wide?: CropBox;
  label?: string;
};

const FIGURES: Record<string, Figure> = {
  // Region x 200..1000, y 392..712 of the Lattice board: the client and
  // project-manager columns, a review card with Approve and Request revision,
  // and a queue card with Approve & send to client. The article and the proof
  // list call it a portal, and to a non-technical owner "OS" reads as
  // operating system.
  "operations-infrastructure": {
    scene: "lattice",
    shot: latticeShot,
    region: { w: 800, h: 320 },
    narrow: { x: 0, y: 0, w: 388, h: 320 },
    wide: { x: 0, y: 0, w: 800, h: 320 },
    label: "Click through the portal",
  },
  // Region x 172..560, y 418..738 of Studio Mix: the agents column only (Echo
  // with its Run button). See the note above.
  "ai-tooling": {
    scene: "studio-mix",
    shot: studioMixShot,
    region: { w: 388, h: 320 },
    narrow: { x: 0, y: 0, w: 388, h: 320 },
  },
};

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

function cropVars(region: Figure["region"], box: CropBox, key: "n" | "w"): Record<string, string> {
  return {
    [`--ar-${key}`]: `${box.w} / ${box.h}`,
    [`--iw-${key}`]: pct(region.w / box.w),
    [`--il-${key}`]: pct(-box.x / box.w),
    [`--it-${key}`]: pct(-box.y / box.h),
  };
}

export function hasDemoFigure(slug: string): boolean {
  const f = FIGURES[slug];
  return Boolean(f && DEMO_SCENES.some((s) => s.slug === f.scene));
}

export function DemoFigure({ slug }: { slug: string }) {
  const f = FIGURES[slug];
  const scene = f ? DEMO_SCENES.find((s) => s.slug === f.scene) : undefined;
  if (!f || !scene) return null;

  const href = `${SITE.demoUrl}/${scene.slug}`;
  const address = `${SITE.demoUrl.replace(/^https?:\/\//, "")}/${scene.slug}`;
  // No wide box: the phone crop at every width. The w vars are still written
  // so the sm: classes below resolve to the same crop.
  const wide = f.wide ?? f.narrow;
  const vars = { ...cropVars(f.region, f.narrow, "n"), ...cropVars(f.region, wide, "w") } as CSSProperties;
  // About 1.15x the crop's own width, so a single column reads near its
  // captured size instead of stretched across the reading column.
  const capped = !f.wide;

  return (
    <a
      href={href}
      rel="noreferrer"
      className={cn("group my-12 block rounded-2xl", capped && "max-w-[28rem]")}
    >
      <figure>
        <div className="frame-lit relative rounded-2xl p-1.5">
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl border border-ink-50/20 opacity-0 transition-opacity duration-[420ms] ease-out group-focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:duration-200"
          />
          {/* Dissolves over the last 12%, not .dissolve's 30%: the Approve
              buttons sit at about 75% of the box, and they are the reason the
              picture is here. */}
          <div
            className="relative overflow-clip rounded-[10px] bg-ink-950 [aspect-ratio:var(--ar-n)] [mask-image:linear-gradient(to_bottom,#000_88%,transparent)] sm:[aspect-ratio:var(--ar-w)]"
            style={vars}
          >
            <div className="shot-parallax absolute inset-0">
              <Image
                src={f.shot}
                alt={`${scene.name}, ${scene.brand}: ${scene.whatItIs}, running on sample data`}
                sizes={
                  capped
                    ? "(min-width: 640px) 448px, 100vw"
                    : "(min-width: 768px) 640px, (min-width: 640px) 100vw, 206vw"
                }
                className="absolute h-auto max-w-none [left:var(--il-n)] [top:var(--it-n)] [width:var(--iw-n)] sm:[left:var(--il-w)] sm:[top:var(--it-w)] sm:[width:var(--iw-w)]"
              />
            </div>
          </div>
        </div>
        <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1">
          <span className="font-mono text-xs text-ink-500">{address}</span>
          <span className="inline-flex items-center gap-2 text-caption text-ink-300 transition-colors group-hover:text-ink-50 group-focus-visible:text-ink-50">
            <span className="link-draw group-focus-visible:[background-size:100%_1px]">
              {f.label ?? scene.openLabel}
            </span>
            <Arrow external />
          </span>
        </figcaption>
      </figure>
    </a>
  );
}
