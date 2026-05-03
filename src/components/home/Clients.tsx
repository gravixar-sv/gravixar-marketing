// Client roster — first 3 with real logos on light cards, the rest as
// typographic names. Same card shape so the grid reads unified
// regardless of how many logos we have at any moment.

import Image from "next/image";

type ClientEntry = {
  name: string;
  logo?: string; // path under /public/clients/
  industry?: string;
};

const CLIENTS: ClientEntry[] = [
  { name: "Dreamixar", logo: "/clients/dreamixar.png", industry: "creative" },
  { name: "Robonamix", logo: "/clients/robonamix.png", industry: "robotics" },
  { name: "XpertPK", logo: "/clients/xpertpk.png", industry: "tech services" },
  { name: "Rima Chahine", industry: "personal brand" },
  { name: "Carttix", industry: "e-commerce" },
  { name: "AAN Associates", industry: "professional services" },
  { name: "Wosqa" },
  { name: "Seven Farms", industry: "food & ag" },
  { name: "Samana Urooj", industry: "personal brand" },
  { name: "GUMBOC" },
  { name: "Zee Project" },
  { name: "Broomstick Hub", industry: "agency" },
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
      {client.logo ? (
        <div className="relative flex h-12 w-full items-center justify-center md:h-14">
          <Image
            src={client.logo}
            alt={`${client.name} logo`}
            width={160}
            height={64}
            className="max-h-full w-auto object-contain"
          />
        </div>
      ) : (
        <span className="font-display text-base font-semibold tracking-tight text-zinc-900 md:text-lg">
          {client.name}
        </span>
      )}
      {client.industry ? (
        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
          {client.industry}
        </span>
      ) : null}
    </div>
  );
}
