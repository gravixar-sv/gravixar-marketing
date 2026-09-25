import Image from "next/image";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/ui/Button";
import { DEMO_SCENES, type CropBox, type DemoScene } from "@/lib/demos";
import { SITE } from "@/lib/seo";

// The live scenes on demo.gravixar.com, one buyer per card. Each card is a real
// captured screenshot in a lit product frame (the product does the talking),
// with the address it opens as a figure caption, and links straight to that
// scene on the live demo. Used on the homepage and on /demos.
//
// NO FAKE WINDOW CHROME. The cards used to wrap each shot in a drawn browser
// bar, over a capture that already carries the demo's own "LIVE DEMO" strip and
// scene nav: three frames deep. The frame is now one lit bezel.
//
// THE CROP IS THE PICTURE (2026-09-23). The frames used to start just under
// the demo's own nav, which made the featured frame mostly the scene's intro
// paragraph and its red eyebrow, and the dissolve then faded out the Approve
// buttons: the one thing on the page that shows the site's whole idea. Each
// scene now names the box it is shown through (`crop` in src/lib/demos.ts):
// the working board from md up, a single column of it on phones so the app
// renders near 1:1 and can actually be read. The frame's aspect is the box,
// and the image is sized and offset in percentages of that box, so the same
// pixels fill the frame at every width. Both boxes travel as CSS variables and
// swap at md, so there is one image and no JS.
//
// The dissolve starts at 90%, below every box's action buttons.
// Every capture is a 1600x1000 CSS-pixel view of the scene (stored at 1.5x);
// crop boxes in demos.ts are in these units.
const SRC = { w: 1600, h: 1000 };
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

function cropVars(box: CropBox, key: "n" | "w"): Record<string, string> {
  return {
    [`--ar-${key}`]: `${box.w} / ${box.h}`,
    [`--iw-${key}`]: pct(SRC.w / box.w),
    [`--il-${key}`]: pct(-box.x / box.w),
    [`--it-${key}`]: pct(-box.y / box.h),
  };
}

// layout "stack" (the default, and what /demos uses): the featured scene full
// width, the other four as a 2x2 grid, stacking on phones.
//
// layout "rail" (the homepage): the featured scene is the section's ONE big
// picture, and the four followers are not a second grid of it.
//   - md and up, they are ROWS in the Selected Work idiom: hairlines between,
//     the whole row is the link, the address, name, buyer and one line on the
//     left, the open link under them, and a small frame (240px) on the right.
//     A 2x2 of identical cards (frame, address, title, pill, two lines, link,
//     four times over) was the one templated moment on the page.
//   - on phones they are a horizontal scroll-snap row, so five tall cards
//     stop being a third of the page. Each card is 82vw, so the next one
//     always peeks in and the row explains itself without a counter.
// It is one DOM for both (the same <a> is a card in the rail and a row from
// md), so nothing is printed twice for assistive tech.
//
// Every row's thumbnail uses the scene's NARROW box at every width: one
// column of the app at about 0.6x still reads as software, where a whole
// 780px board squeezed into 240px is texture. None of the narrow boxes opens
// on an idle "standing by" panel; two of the wide ones do (see demos.ts).
export function DemoGrid({
  priority = false,
  layout = "stack",
}: {
  priority?: boolean;
  layout?: "stack" | "rail";
}) {
  const [featured, ...rest] = DEMO_SCENES;
  if (!featured) return null;
  // reveal-stagger sits on the outer pair (featured, then the followers as one
  // block) rather than on the rail's cards: a scroll-driven reveal binds to the
  // nearest scroll container, and inside a horizontal scroller that would be
  // the scroller, not the page.
  return (
    <div className="reveal-stagger grid gap-12 [--stagger:90ms] md:gap-16">
      {/* On /demos (priority) the featured card is the fold: .reveal-skip keeps
          it out of the scroll reveal so it never starts part-faded. */}
      <SceneCard scene={featured} priority={priority} featured className={priority ? "reveal-skip" : undefined} />
      {layout === "rail" ? (
        <ul className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-4 overflow-x-auto px-6 pb-6 [scrollbar-width:none] md:mx-0 md:block md:snap-none md:overflow-visible md:border-b md:border-line md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {rest.map((scene) => (
            <li key={scene.slug} className="w-[82vw] shrink-0 snap-start md:w-auto">
              <SceneRow scene={scene} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-12 md:grid-cols-2 md:gap-x-6 md:gap-y-14">
          {rest.map((scene, i) => (
            <SceneCard key={scene.slug} scene={scene} priority={priority && i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function sceneLink(scene: DemoScene) {
  return {
    href: `${SITE.demoUrl}/${scene.slug}`,
    address: `${SITE.demoUrl.replace(/^https?:\/\//, "")}/${scene.slug}`,
  };
}

// The lit bezel and the cropped capture inside it. `wide` is the box used from
// md up; rows pass the narrow box for both, so their thumbnail never swaps.
function Frame({
  scene,
  wide,
  sizes,
  priority,
  compact = false,
  lift = true,
  className,
}: {
  scene: DemoScene;
  wide: CropBox;
  sizes: string;
  priority: boolean;
  compact?: boolean;
  lift?: boolean;
  className?: string;
}) {
  const vars = { ...cropVars(scene.crop.narrow, "n"), ...cropVars(wide, "w") } as CSSProperties;
  return (
    // The frame is the only thing that moves on a card: a 4px lift on the way
    // in (280ms) and a slower settle on the way out (420ms), with its edge
    // brightening. motion-safe, so reduced motion keeps the edge light and
    // drops the lift, on hover and on keyboard focus alike. Rows do not lift
    // (their hairline answers the pointer), they only brighten the edge.
    <div
      className={`frame-lit relative transition-[translate] duration-[420ms] ease-out group-hover:duration-[280ms] group-focus-visible:duration-[280ms] ${
        compact ? "rounded-2xl p-1.5 md:rounded-xl md:p-1" : "rounded-2xl p-1.5"
      } ${lift ? "motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-y-1" : ""} ${
        className ?? ""
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-px border border-ink-50/20 opacity-0 transition-opacity duration-[420ms] ease-out group-hover:opacity-100 group-hover:duration-200 group-focus-visible:opacity-100 ${
          compact ? "rounded-2xl md:rounded-xl" : "rounded-2xl"
        }`}
      />
      <div
        className={`relative overflow-clip bg-ink-950 [aspect-ratio:var(--ar-n)] [mask-image:linear-gradient(to_bottom,#000_90%,transparent)] md:[aspect-ratio:var(--ar-w)] ${
          compact ? "rounded-[10px] md:rounded-lg" : "rounded-[10px]"
        }`}
        style={vars}
      >
        <div className="shot-parallax absolute inset-0">
          <Image
            src={scene.shot}
            alt={`${scene.name}: ${scene.whatItIs}`}
            width={SRC.w}
            height={SRC.h}
            sizes={sizes}
            priority={priority}
            className="absolute h-auto max-w-none [left:var(--il-n)] [top:var(--it-n)] [width:var(--iw-n)] md:[left:var(--il-w)] md:[top:var(--it-w)] md:[width:var(--iw-w)]"
          />
        </div>
      </div>
    </div>
  );
}

function OpenLabel({ scene, className }: { scene: DemoScene; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-caption text-ink-300 transition-colors group-hover:text-ink-50 group-focus-visible:text-ink-50 ${
        className ?? ""
      }`}
    >
      <span className="link-draw group-focus-visible:[background-size:100%_1px]">{scene.openLabel}</span>
      <Arrow external />
    </span>
  );
}

function SceneCard({
  scene,
  priority,
  featured = false,
  className,
}: {
  scene: DemoScene;
  priority: boolean;
  featured?: boolean;
  className?: string;
}) {
  const { href, address } = sceneLink(scene);
  // The rendered image is the frame width times (capture width / box width).
  // A narrow box is about a quarter of the capture, so on phones the image is
  // about four frame-widths wide; the source is 2400px, so the optimiser has
  // real pixels for it.
  const sizes = featured
    ? "(min-width: 1200px) 1460px, (min-width: 768px) 125vw, 400vw"
    : "(min-width: 1200px) 1090px, (min-width: 768px) 100vw, 400vw";
  return (
    <a href={href} rel="noreferrer" className={`group block rounded-2xl ${className ?? ""}`}>
      <figure>
        <Frame scene={scene} wide={scene.crop.wide} sizes={sizes} priority={priority} />
        <figcaption className="mt-3 px-1 font-mono text-xs text-ink-500">{address}</figcaption>
      </figure>

      <div
        className={`mt-4 px-1 ${
          featured ? "md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10" : ""
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3
              className={`font-semibold tracking-[-0.015em] text-ink-100 ${
                featured ? "text-2xl md:text-[1.75rem]" : "text-lg"
              }`}
            >
              {scene.name}
              <span className="ml-2 font-normal text-ink-500">{scene.brand}</span>
            </h3>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-caption text-ink-400">
              For {scene.personaLabel}
            </span>
          </div>
          <p
            className={`mt-2 max-w-[62ch] text-ink-400 ${
              featured ? "text-base md:text-lead" : "text-[0.9375rem] leading-relaxed"
            }`}
          >
            {scene.whatItIs}. {scene.tryLine}
          </p>
        </div>
        <OpenLabel scene={scene} className={featured ? "mt-4 md:mt-0" : "mt-3"} />
      </div>
    </a>
  );
}

// A follower on the homepage: a card in the phone rail, a hairline row from
// md. The frame is DOM-first so it leads on phones, and is placed in column 2
// from md. The buyer is a plain caption, not a pill: in a row it is a fact
// about the scene, not a control. Hover is the Selected Work hairline (ivory,
// from the left, transform only), never coral: a hover is not a decision.
// The hairline's pseudo is declared at EVERY width, at scale 0, and only its
// hover is md-scoped: scoped to md, it sat at scale 1 below md and swept
// across the row whenever the viewport crossed md.
function SceneRow({ scene }: { scene: DemoScene }) {
  const { href, address } = sceneLink(scene);
  // Phones: the narrow box at 82vw, about 4.1 frame-widths of image. From md
  // the frame is 240px, so the image is about 990px wide.
  const sizes = "(min-width: 768px) 990px, 340vw";
  return (
    <a
      href={href}
      rel="noreferrer"
      className="group relative grid gap-4 rounded-2xl before:absolute before:inset-x-0 before:-top-px before:h-px before:origin-left before:scale-x-0 before:bg-ink-600 before:transition-transform before:duration-[240ms] before:ease-out md:grid-cols-[minmax(0,1fr)_240px] md:items-center md:gap-12 md:rounded-none md:border-t md:border-line md:py-8 md:hover:before:scale-x-100 motion-reduce:before:transition-none"
    >
      <Frame
        scene={scene}
        wide={scene.crop.narrow}
        sizes={sizes}
        priority={false}
        compact
        lift={false}
        className="md:col-start-2 md:row-start-1"
      />
      <div className="px-1 md:col-start-1 md:row-start-1 md:px-0">
        <p className="font-mono text-xs text-ink-500">{address}</p>
        <h3 className="mt-3 text-lg font-semibold tracking-[-0.015em] text-ink-100 transition-colors duration-200 group-hover:text-ink-50 group-focus-visible:text-ink-50 md:text-xl">
          {scene.name}
          <span className="ml-2 font-normal text-ink-500">{scene.brand}</span>
        </h3>
        <p className="mt-1 text-caption text-ink-400">For {scene.personaLabel}</p>
        <p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed text-ink-400">
          {scene.whatItIs}. {scene.tryLine}
        </p>
        <OpenLabel scene={scene} className="mt-4" />
      </div>
    </a>
  );
}

// Homepage section: one statement over the gallery. It used to be two-tone,
// with a second sentence and a floating caption that restated the site banner
// ("working apps with sample data", "no signup"); the banner already says both,
// and each card's "For ..." tag says who the scene is for.
export function Demos() {
  return (
    <section aria-labelledby="demos-heading">
      <h2 id="demos-heading" className="max-w-[30ch] text-statement text-ink-50">
        Pick the demo closest to your desk.
      </h2>
      <div className="mt-10 md:mt-14">
        <DemoGrid layout="rail" />
      </div>
    </section>
  );
}
