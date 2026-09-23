// About-page portrait. The image lives at public/about/qamar.jpg.
// To swap the photo, drop a new file at that path with the same name.
//
// ART DIRECTION. The source is a bright studio shot on a light grey paper backdrop,
// which made it the brightest surface on a dark site: a headshot pasted onto
// the page. It is now set INTO the dark: warm grayscale, pulled down a stop,
// a soft light from above (the same direction as the page's ember horizon),
// and a vignette that lets the backdrop fall away into the ground. The frame
// is the site's lit product frame, and a mono figure caption sits under it.
//
// CROP. 4:3 on phones (the portrait sits directly under the h1 there, so it
// must not take a whole screen), 4:5 beside the h1 from lg. The face is above
// centre and right of middle in the source; the object positions keep it in
// frame at both ratios.
//
// It sits above the fold at every width (beside the h1 on desktop, directly
// under it on phones), so it keeps `priority`.

import Image from "next/image";
import { cn } from "@/lib/cn";
import styles from "./Portrait.module.css";

export function Portrait({ className }: { className?: string }) {
  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className={cn(
          styles.frame,
          "frame-lit relative aspect-[4/3] overflow-hidden rounded-2xl sm:aspect-[3/2] lg:aspect-[4/5]",
        )}
      >
        <Image
          src="/about/qamar.jpg"
          alt="Qamar, founder of Gravixar"
          fill
          sizes="(min-width: 1024px) 368px, (min-width: 640px) 90vw, 100vw"
          className="object-cover object-[56%_22%] grayscale sepia-[.24] brightness-[.8] contrast-[1.08] lg:object-[58%_50%]"
          priority
        />
        {/* Light from above, warm, laid over the photograph. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_70%_at_55%_-12%,rgb(255_196_160/0.16),transparent_62%)] mix-blend-soft-light"
        />
        {/* The backdrop falls away into the ground at the edges. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(85%_78%_at_57%_34%,transparent_42%,rgb(12_10_9/0.72)_100%)]"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-bg/80 to-transparent" />
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-4 font-mono text-label-sm text-ink-500">
        <span>Qamar</span>
        <span>Islamabad</span>
      </figcaption>
    </figure>
  );
}
