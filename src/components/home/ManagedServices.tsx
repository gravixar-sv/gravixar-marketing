import Link from "next/link";

// Managed services: the ongoing "keep the lights on" offering for client
// websites (WordPress management, hosting, email, maintenance, updates).
// Two real retainers run on this today; both are described generically here
// (no client names or links) until the operator clears naming them.
//
// Reads as a SUBSECTION of ServicesPreview, not a peer: that heading promises
// three builds plus one thing kept running, which is exactly the four service
// files, so this fifth un-numbered offer gets no coral eyebrow and a smaller
// h2. The retainer link stays a secondary button though, since it sells the
// same paid outcome as the Hero and ContactCTA buttons pointing at /contact.

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
      {/* h3, not h2: page.tsx nests this inside ServicesPreview's Reveal, so a
          peer h2 would give the outline two sibling sections where the visual
          hierarchy shows one under the other. */}
      <h3 className="text-2xl font-semibold tracking-[-0.01em] text-zinc-200 md:text-subsection">
        Some things just need keeping running.
      </h3>
      <p className="mt-4 max-w-2xl text-zinc-400">
        I run ongoing managed services for client websites: WordPress
        management, hosting, email, maintenance, updates. Invisible when it is
        done right, very visible when nobody is doing it.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="card-surface rounded-xl p-6 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            what I keep running
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-300">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-700" />
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
            className="mt-6 inline-flex self-start rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-[color,border-color,transform] hover:border-brand hover:text-brand-soft active:scale-[0.98]"
          >
            Talk about a retainer
          </Link>
        </div>
      </div>
    </section>
  );
}
