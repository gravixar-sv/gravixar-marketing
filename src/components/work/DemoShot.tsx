import Image from "next/image";
import { Arrow, buttonClass } from "@/components/ui/Button";
import type { DemoScene } from "@/lib/demos";
import { cn } from "@/lib/cn";

// The sample-data demo that matches a study, shown big in a lit frame. The
// heading says it is sample data, once; the caption is the machine's own
// address for it. Client screens never leave the building, and this frame
// must never be read as the client's system.
//
// Phones get the heading, the sentence and the button, not the frame: a
// 1600px desktop capture at phone width sets its text at about 4px, a
// screen of scroll that shows nothing legible. The live demo reads properly
// on a phone, so the button is the better picture there.
export function DemoShot({ scene, href }: { scene: DemoScene; href: string }) {
  return (
    <section aria-labelledby="demo-version" className="mt-24 md:mt-32">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
        <h2 id="demo-version" className="max-w-[18ch] text-section font-semibold text-ink-50 lg:col-span-7">
          The same kind of build, on sample data
        </h2>
        <div className="lg:col-span-5">
          <p className="max-w-[46ch] text-ink-300">
            The client&apos;s screens stay private, so {scene.brand} on demo.gravixar.com is a separate build of
            the same pattern, under its own brand. No signup.
          </p>
          <a href={href} rel="noreferrer" className={cn("group mt-5", buttonClass({ variant: "ghost", size: "md" }))}>
            Open {scene.brand}
            <Arrow external />
          </a>
        </div>
      </div>

      <figure className="mt-10 hidden sm:block md:mt-12">
        <div className="frame-lit overflow-clip rounded-2xl">
          <div className="dissolve relative aspect-[1600/738] overflow-clip">
            <Image
              src={scene.shot}
              alt={`The ${scene.brand} demo on demo.gravixar.com, running on sample data`}
              fill
              sizes="(min-width: 1152px) 1104px, 100vw"
              className="shot-parallax object-cover object-top"
            />
          </div>
        </div>
        <figcaption className="mt-4 font-mono text-label-sm text-ink-500">demo.gravixar.com/{scene.slug}</figcaption>
      </figure>
    </section>
  );
}
