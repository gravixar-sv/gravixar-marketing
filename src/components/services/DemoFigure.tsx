import Image from "next/image";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/ui/Button";
import { DEMO_SCENES, type CropBox } from "@/lib/demos";
import { SITE } from "@/lib/seo";

// A real screenshot of the matching demo, shown inside a service article where
// the prose invites the reader to try it. Operations Infrastructure opened by
// saying "try the Lattice demo" and then showed none of it; the capture was
// already in the repo. Placed by an MDX comment, {/* demo-shot */}, so the
// article decides where the picture sits (see splitAtMarkers in ./body).
//
// The capture, the scene's name and its phone crop come from src/lib/demos.ts,
// so a re-capture there updates this frame too. Only the wide crop is local:
// the homepage's featured Lattice box is the whole board (about 3.7:1), which
// in a 600px reading column is a 160px strip. Here the wide box is two columns
// of the board, near 2.5:1, so the cards and their Approve buttons read.
//
// The frame is a link to the live scene. Hover brightens its edge and draws
// the caption's underline; nothing lifts, so the column never shifts.
const SRC = { w: 1600, h: 738 };

const FIGURES: Record<string, { scene: string; wide: CropBox }> = {
  // Client and project-manager columns: a review card with Approve and
  // Request revision, and a queue card with Approve & send to client.
  "operations-infrastructure": { scene: "lattice", wide: { x: 200, y: 392, w: 800, h: 320 } },
  // The agents column (Echo with its Run button) beside the output pane.
  "ai-tooling": { scene: "studio-mix", wide: { x: 200, y: 418, w: 780, h: 320 } },
};

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

function cropVars(box: CropBox, key: "n" | "w"): Record<string, string> {
  return {
    [`--ar-${key}`]: `${box.w} / ${box.h}`,
    [`--iw-${key}`]: pct(SRC.w / box.w),
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
  const vars = { ...cropVars(scene.crop.narrow, "n"), ...cropVars(f.wide, "w") } as CSSProperties;

  return (
    <a href={href} rel="noreferrer" className="group my-12 block rounded-2xl">
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
            className="relative overflow-hidden rounded-[10px] bg-ink-950 [aspect-ratio:var(--ar-n)] [mask-image:linear-gradient(to_bottom,#000_88%,transparent)] sm:[aspect-ratio:var(--ar-w)]"
            style={vars}
          >
            <div className="shot-parallax absolute inset-0">
              <Image
                src={scene.shot}
                alt={`${scene.name}, ${scene.brand}: ${scene.whatItIs}, running on sample data`}
                width={SRC.w}
                height={SRC.h}
                sizes="(min-width: 1024px) 1250px, (min-width: 768px) 120vw, (min-width: 640px) 190vw, 400vw"
                className="absolute h-auto max-w-none [left:var(--il-n)] [top:var(--it-n)] [width:var(--iw-n)] sm:[left:var(--il-w)] sm:[top:var(--it-w)] sm:[width:var(--iw-w)]"
              />
            </div>
          </div>
        </div>
        <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1">
          <span className="font-mono text-xs text-ink-500">{address}</span>
          <span className="inline-flex items-center gap-2 text-caption text-ink-300 transition-colors group-hover:text-ink-50 group-focus-visible:text-ink-50">
            <span className="link-draw group-focus-visible:[background-size:100%_1px]">{scene.openLabel}</span>
            <Arrow external />
          </span>
        </figcaption>
      </figure>
    </a>
  );
}
