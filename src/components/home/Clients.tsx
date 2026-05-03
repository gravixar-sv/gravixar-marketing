// Client roster — curated 8 with real logos. Each on a light card so
// brand colors stay intact regardless of original color treatment.
// To add more: drop a logo into /public/clients/ and append a row here.

import Image from "next/image";

type ClientEntry = {
  name: string;
  logo: string;
  industry?: string;
};

const CLIENTS: ClientEntry[] = [
  { name: "Broomstick HUB", logo: "/clients/broomstick-hub.png", industry: "agency portal" },
  { name: "Broomstick Creative", logo: "/clients/broomstick-creative.png", industry: "creative agency" },
  { name: "Beeline", logo: "/clients/beeline.png", industry: "healthcare" },
  { name: "OORT", logo: "/clients/oort.png", industry: "infrastructure" },
  { name: "XpertPK", logo: "/clients/xpertpk.png", industry: "tech services" },
  { name: "GOMBOC", logo: "/clients/gomboc.avif" },
  { name: "Rima Chahine", logo: "/clients/rima-chahine.png", industry: "personal brand" },
  { name: "SAFFM", logo: "/clients/saffm.png" },
];

export function Clients() {
  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        {CLIENTS.map((c) => (
          <ClientCard key={c.name} client={c} />
        ))}
      </div>
      <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        and more — engagements range from one-off brand systems to full custom portals running in production
      </p>
    </div>
  );
}

function ClientCard({ client }: { client: ClientEntry }) {
  return (
    <div
      className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.96] p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10"
      title={client.industry ? `${client.name} — ${client.industry}` : client.name}
    >
      <div className="relative flex h-12 w-full items-center justify-center md:h-14">
        <Image
          src={client.logo}
          alt={`${client.name} logo`}
          width={160}
          height={64}
          className="max-h-full w-auto object-contain"
        />
      </div>
      {client.industry ? (
        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
          {client.industry}
        </span>
      ) : (
        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400">
          {client.name}
        </span>
      )}
    </div>
  );
}
