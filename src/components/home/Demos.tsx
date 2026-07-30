import Image from "next/image";
import { DEMO_SCENES, type DemoScene } from "@/lib/demos";
import { SITE } from "@/lib/seo";

// The live scenes on demo.gravixar.com, one buyer per card. Each card is a
// real captured screenshot in a neutral window frame (the product does the
// talking), and links straight to that scene on the live demo. Used on the
// homepage and on /demos.

export function DemoGrid({ priority = false }: { priority?: boolean }) {
  // Five scenes: the flagship (Lattice) leads full-width, the other four
  // sit in a 2-up grid below. Breaks the orphan half-row a plain 2-col
  // grid leaves with an odd count, and gives the lineup a hierarchy.
  // Slower stagger than the page default (70ms): these are heavy screenshot
  // cards, so a 90ms step lets the featured one visibly lead its followers
  // instead of arriving with them. Fallback path only: engines with
  // scroll-driven animation stagger by a scroll offset instead, and globals.css
  // uses a mod-3 cycle there so this grid's {4,5} row still gets a beat.
  return (
    <div className="reveal-stagger grid gap-5 md:grid-cols-2 [--stagger:90ms]">
      {DEMO_SCENES.map((scene, i) => (
        <SceneCard
          key={scene.slug}
          scene={scene}
          priority={priority && i < 2}
          featured={i === 0}
        />
      ))}
    </div>
  );
}

function SceneCard({
  scene,
  priority,
  featured = false,
}: {
  scene: DemoScene;
  priority: boolean;
  featured?: boolean;
}) {
  return (
    <a
      href={`${SITE.demoUrl}/${scene.slug}`}
      rel="noreferrer"
      className={`group block rounded-xl ${featured ? "md:col-span-2" : ""}`}
    >
      <div className="overflow-hidden rounded-xl border border-line bg-zinc-950/60 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.85)] transition-[transform,border-color,box-shadow] duration-500 ease-out group-hover:-translate-y-1 group-hover:border-brand/40 group-hover:shadow-[0_36px_72px_-30px_rgba(0,0,0,0.9)]">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span className="ml-2 font-mono text-[10px] text-zinc-500">
              demo.gravixar.com/{scene.slug}
            </span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
            live
          </span>
        </div>
        <div className="relative aspect-[1600/738] w-full overflow-hidden bg-black">
          <Image
            src={scene.shot}
            alt={`${scene.name}: ${scene.whatItIs}`}
            fill
            sizes={featured ? "(min-width: 768px) 1152px, 100vw" : "(min-width: 768px) 50vw, 100vw"}
            priority={priority}
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          />
        </div>
      </div>

      <div className="px-1 pb-1 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.015em] text-zinc-100">
            {scene.name}
            <span className="ml-2 font-mono text-xs font-normal text-zinc-500">
              · {scene.brand}
            </span>
          </h3>
          <span
            className="rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]"
            style={{ borderColor: `${scene.accent}40`, color: scene.accent }}
          >
            for {scene.personaLabel}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          {scene.whatItIs}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line-soft pt-3">
          <p className="text-sm leading-relaxed text-zinc-500">{scene.tryLine}</p>
          <span className="link-draw inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
            {scene.openLabel}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              ↗
            </span>
          </span>
        </div>
      </div>
    </a>
  );
}

// Homepage section: eyebrow + heading + the 4-up grid.
export function Demos() {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            the demos
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-section">
            Pick the scene closest to your desk.
          </h2>
          <p className="mt-4 max-w-xl text-zinc-400">
            Five working apps with sample data, one for each kind of buyer. Click
            in, press the buttons, watch the loop run. No signup.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          sandbox · resets every sunday
        </p>
      </div>
      <div className="mt-10">
        <DemoGrid />
      </div>
    </section>
  );
}
