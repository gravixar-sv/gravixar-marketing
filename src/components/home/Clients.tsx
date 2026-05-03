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
  // Broomstick logos use the white-on-transparent versions, so no invert needed
  { name: "Broomstick HUB", logo: "/clients/broomstick-hub.png" },
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
    <div className="mt-10">
      <div className="relative overflow-hidden py-4">
        {/* Edge fades on left/right matching the page bg */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0a0a] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent"
        />
        <div
          className="flex animate-marquee items-center gap-16 will-change-transform"
          aria-label={`Clients: ${CLIENTS.map((c) => c.name).join(", ")}`}
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
                className={`max-h-full max-w-full object-contain opacity-80 transition-opacity hover:opacity-100 ${
                  c.invertOnDark ? "[filter:brightness(0)_invert(1)]" : ""
                }`}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        and more. engagements range from one-off brand systems to full custom portals running in production
      </p>
    </div>
  );
}
