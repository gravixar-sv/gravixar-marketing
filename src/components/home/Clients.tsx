// Client roster as a slow logo rail on the dark canvas.
//
// ONE TREATMENT FOR EVERY MARK. Each logo is flattened to an ivory silhouette
// ([filter:brightness(0)_invert(1)]) at half opacity, so a teal wordmark, a red
// one and a white one stop competing and read as one roster. That filter keeps
// only the alpha channel, so it is safe ONLY on files with a transparent
// background: a solid background would print as a white block. All seven were
// checked on 2026-09-23 (alpha coverage plus a silhouette render): every one is
// transparent. GOMBOC's edge pixels are partly opaque only because its glyphs
// touch the canvas edge, not because of a backdrop. Check a new file the same
// way before adding it here, and if it has a background, give it a
// transparent export rather than an exception to the filter.
//
// OPTICAL SIZE, NOT BOX SIZE. The files range from 1.9:1 to 16:1, so a shared
// 180x48 box made OORT and GOMBOC heavy and Rima Chahine a hairline. Each mark
// carries its own height (`h`, px at md+) instead, tuned by eye so the row
// reads at one weight. Phones take 85% of it.
//
// THE LOOP. The row is w-max (.animate-marquee in globals.css), so -50% is
// exactly one period because the list is printed twice, and each item carries
// its own trailing space (pr-*) instead of a flex gap, so the period has no
// half-gap seam. The duplicate set is marked data-dup: under reduced motion
// globals.css hides it and wraps the first set as a centred static roster, and
// motion-reduce:px-* below swaps the trailing space for even padding so that
// roster actually centres. The edge fade is a mask on .marquee-viewport, which
// also pauses the rail on hover and focus-within.
//
// Add a logo: drop a transparent file into /public/clients/, append it here
// with its natural width and height, and tune `h` against its neighbours.

import Image from "next/image";
import type { CSSProperties } from "react";

type ClientEntry = {
  name: string;
  logo: string;
  /** Natural pixel size of the file, for the intrinsic aspect ratio. */
  width: number;
  height: number;
  /** Rendered height in px at md and up, tuned for optical weight. */
  h: number;
};

const CLIENTS: ClientEntry[] = [
  { name: "Broomstick Creative", logo: "/clients/broomstick-creative.png", width: 1200, height: 152, h: 17 },
  { name: "Beeline", logo: "/clients/beeline.png", width: 1024, height: 388, h: 34 },
  { name: "OORT", logo: "/clients/oort.png", width: 128, height: 48, h: 26 },
  { name: "XpertPK", logo: "/clients/xpertpk.png", width: 154, height: 38, h: 28 },
  { name: "GOMBOC", logo: "/clients/gomboc.avif", width: 512, height: 197, h: 28 },
  { name: "Rima Chahine", logo: "/clients/rima-chahine.png", width: 295, height: 18, h: 12 },
  { name: "SAFFM", logo: "/clients/saffm.png", width: 184, height: 85, h: 36 },
];

function Logo({ client, dup }: { client: ClientEntry; dup: boolean }) {
  return (
    <li
      data-dup={dup ? "" : undefined}
      aria-hidden={dup || undefined}
      className="flex shrink-0 items-center pr-12 md:pr-20 motion-reduce:px-4 md:motion-reduce:px-5"
    >
      <Image
        src={client.logo}
        // The first set is the accessible roster, so its alt is the client's
        // name. The duplicate exists only for the loop and is hidden above.
        alt={dup ? "" : client.name}
        width={client.width}
        height={client.height}
        // Eager for the first pass, lazy for the duplicate: the duplicate
        // reuses the cached files, so it costs nothing on first wrap.
        loading={dup ? "lazy" : "eager"}
        style={{ "--h": `${client.h}px` } as CSSProperties}
        className="h-[calc(var(--h)*0.85)] w-auto max-w-none opacity-50 transition-opacity duration-200 ease-out [filter:brightness(0)_invert(1)] hover:opacity-90 md:h-[var(--h)]"
      />
    </li>
  );
}

export function Clients() {
  return (
    <div className="marquee-viewport overflow-hidden py-3">
      <ul aria-label="Clients" className="flex animate-marquee items-center">
        {CLIENTS.map((c) => (
          <Logo key={c.name} client={c} dup={false} />
        ))}
        {CLIENTS.map((c) => (
          <Logo key={`${c.name}-dup`} client={c} dup />
        ))}
      </ul>
    </div>
  );
}
