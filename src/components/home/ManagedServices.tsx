import Link from "next/link";

// Managed services: the ongoing "keep the lights on" offering for client
// websites (WordPress management, hosting, email, maintenance, updates).
// Two real retainers run on this today; both are described generically here
// (no client names or links) until the operator clears naming them.

const INCLUDED = [
  "WordPress site management",
  "Hosting, set up and kept running",
  "Email (domains, deliverability, the boring parts)",
  "Maintenance: updates, backups, security patches",
  "Content and small changes on request",
];

export function ManagedServices() {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        managed services
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
        Not everything needs a build. Some things just need keeping running.
      </h2>
      <p className="mt-4 max-w-2xl text-zinc-400">
        Alongside the custom platforms, I run ongoing managed services for
        client websites: WordPress management, hosting, email, maintenance, and
        updates. The kind of work that is invisible when it is done right and
        very visible when nobody is doing it.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="card-surface rounded-xl p-6 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            what I keep running
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-300">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="live-panel flex flex-col rounded-xl p-6 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            running today
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            Two clients run on this right now. One is on the full stack: site,
            email, hosting, and ongoing services. One is on maintenance and
            updates, the steady hand that keeps a live site healthy.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Both are real, ongoing retainers. Pick the level that matches what
            your site actually needs.
          </p>
          <Link
            href="/contact"
            className="link-draw mt-6 inline-block self-start font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-brand"
          >
            talk about a retainer
          </Link>
        </div>
      </div>
    </section>
  );
}
