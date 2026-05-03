// Client roster as a horizontal marquee on a subtle light band. Logos
// keep their original brand colors. Pauses on hover.
//
// Add a logo: drop the file into /public/clients/ and append to CLIENTS.
// Logos are designed for light backgrounds so the band is off-white.

import Image from "next/image";

type ClientEntry = {
  name: string;
  logo: string;
};

const CLIENTS: ClientEntry[] = [
  { name: "Broomstick HUB", logo: "/clients/broomstick-hub.png" },
  { name: "Broomstick Creative", logo: "/clients/broomstick-creative.png" },
  { name: "Beeline", logo: "/clients/beeline.png" },
  { name: "OORT", logo: "/clients/oort.png" },
  { name: "XpertPK", logo: "/clients/xpertpk.png" },
  { name: "GOMBOC", logo: "/clients/gomboc.avif" },
  { name: "Rima Chahine", logo: "/clients/rima-chahine.png" },
  { name: "SAFFM", logo: "/clients/saffm.png" },
];

export function Clients() {
  // Duplicate the array so the translateX(-50%) loop appears seamless.
  const loop = [...CLIENTS, ...CLIENTS];

  return (
    <div className="mt-10">
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.97] py-8">
        {/* Edge fades on left/right so logos slide in/out softly */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent"
        />
        <div
          className="flex animate-marquee items-center gap-14 will-change-transform"
          aria-label={`Clients: ${CLIENTS.map((c) => c.name).join(", ")}`}
        >
          {loop.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="flex shrink-0 items-center"
              title={c.name}
            >
              <Image
                src={c.logo}
                alt={`${c.name} logo`}
                width={160}
                height={56}
                className="h-10 w-auto object-contain md:h-12"
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
