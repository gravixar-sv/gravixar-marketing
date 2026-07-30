// Client roster as a horizontal marquee directly on the dark canvas.
// Logos that ship as white-on-transparent display as-is. Logos that ship
// as black-on-transparent get invertOnDark applied so they read on dark.
// Logos with brand color accents are left alone.
//
// Add a logo: drop the file into /public/clients/ and append to CLIENTS.
// If the logo is dark/black on transparent, set invertOnDark: true.

import Image from "next/image";

type ClientEntry = {
  name: string;
  logo: string;
  /** Apply CSS filter to flip dark monochrome logos to white. */
  invertOnDark?: boolean;
};

const CLIENTS: ClientEntry[] = [
  // Broomstick Creative uses the white-on-transparent version, no invert needed
  { name: "Broomstick Creative", logo: "/clients/broomstick-creative.png" },
  // Beeline, OORT, GOMBOC, XpertPK have brand colors that work on dark
  { name: "Beeline", logo: "/clients/beeline.png" },
  { name: "OORT", logo: "/clients/oort.png", invertOnDark: true },
  { name: "XpertPK", logo: "/clients/xpertpk.png" },
  { name: "GOMBOC", logo: "/clients/gomboc.avif" },
  // Black text-only logos need invert to show on dark
  { name: "Rima Chahine", logo: "/clients/rima-chahine.png", invertOnDark: true },
  { name: "SAFFM", logo: "/clients/saffm.png", invertOnDark: true },
];

export function Clients() {
  // Duplicate the array so the translateX(-50%) loop appears seamless.
  const loop = [...CLIENTS, ...CLIENTS];

  return (
    <div className="relative mt-10 overflow-hidden py-4">
      {/* Edge fades on left/right matching the page bg */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0a0a] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent"
      />
      {/* The moving row is decorative: it prints every logo twice for the loop,
          and its only stop is a :hover no keyboard user can reach. Assistive
          tech reads the static roster below instead, so the animation is never
          the sole path to the names. */}
      <div
        aria-hidden
        className="flex animate-marquee items-center gap-16 will-change-transform"
      >
        {loop.map((c, i) => (
          <div
            key={`${c.name}-${i}`}
            className="relative flex h-12 w-[180px] shrink-0 items-center justify-center"
            title={c.name}
          >
            <Image
              src={c.logo}
              alt={`${c.name} logo`}
              width={180}
              height={48}
              // Eager for the first pass, lazy for the duplicate. The row is
              // wider than the viewport inside overflow-hidden, so lazy on the
              // originals leaves blank 180x48 slots that pop in on first wrap;
              // the duplicate reuses the same cached files, so it costs nothing.
              loading={i < CLIENTS.length ? "eager" : "lazy"}
              className={`max-h-full max-w-full object-contain opacity-80 transition-opacity hover:opacity-100 ${
                c.invertOnDark ? "[filter:brightness(0)_invert(1)]" : ""
              }`}
            />
          </div>
        ))}
      </div>
      <ul aria-label="Clients" className="sr-only">
        {CLIENTS.map((c) => (
          <li key={c.name}>{c.name}</li>
        ))}
      </ul>
    </div>
  );
}
