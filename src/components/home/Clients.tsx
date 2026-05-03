// Client roster grid. Names only for now — logos drop into public/clients/
// later, then we render <Image /> per entry. The roster lives in this file
// (not in MDX) because the schema is small enough that a typed array beats
// frontmatter overhead, and the homepage is the only place it's used.

const CLIENTS = [
  { name: "Dreamixar" },
  { name: "Robonamix" },
  { name: "Rima Chahine" },
  { name: "XpertPK" },
  { name: "Carttix" },
  { name: "AAN Associates" },
  { name: "Wosqa" },
  { name: "Seven Farms" },
  { name: "Samana Urooj" },
  { name: "GUMBOC" },
  { name: "Zee Project" },
  { name: "SAFFM" },
  { name: "Oort" },
  { name: "ZAT" },
  { name: "Broomstick Hub" },
  { name: "Beeline" },
] as const;

export function Clients() {
  return (
    <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 md:p-8">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-4">
        {CLIENTS.map((c) => (
          <div
            key={c.name}
            className="group flex items-center gap-3 border-b border-zinc-900 py-2 transition-colors hover:border-brand/40"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700 transition-colors group-hover:bg-brand" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-300 transition-colors group-hover:text-zinc-100">
              {c.name}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        and more — engagements range one-off brand systems → full custom portals running in production
      </p>
    </div>
  );
}
