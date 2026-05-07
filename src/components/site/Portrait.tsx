// About-page portrait. The image lives at public/about/qamar.jpg.
// To swap the photo, drop a new file at that path with the same name.
//
// Aspect ratio is 4:5 with object-cover, which crops the sides of a
// square source slightly to keep the face centered. If the source
// changes shape, adjust `aspect-[4/5]` accordingly or rely on
// object-cover.

import Image from "next/image";

export function Portrait() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40">
      <Image
        src="/about/qamar.jpg"
        alt="Qamar"
        fill
        sizes="(min-width: 1024px) 340px, 100vw"
        className="object-cover object-center"
        priority
      />
    </div>
  );
}
