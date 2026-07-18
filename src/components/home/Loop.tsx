// The approval loop: the mechanism behind the hero's "asks before it
// acts" and the thing every demo card means by "watch the loop run".
// Deliberately not a card grid; an open three-step strip on a hairline,
// with a slow brand pulse traveling the connector (CSS-only, decorative).

const STEPS = [
  {
    n: "01",
    title: "The agent drafts",
    body: "Replies, content, screening notes, invoices. Prepared with full context from your stack, not from a blank prompt.",
  },
  {
    n: "02",
    title: "A human approves",
    body: "Every write waits for a click from someone accountable. Nothing reaches a client, a ledger, or production on its own.",
  },
  {
    n: "03",
    title: "The system learns",
    body: "Each approval tightens the rule the next draft follows. The queue gets quieter every week, not louder.",
  },
] as const;

export function Loop() {
  return (
    <section aria-label="How the approval loop works">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        how it works
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
        One loop runs everything.
      </h2>
      <p className="mt-4 max-w-2xl text-zinc-400">
        Every module I ship, from the demos to the client portals, moves work
        through the same three steps. It is the reason the AI gets trusted with
        real operations.
      </p>

      <div className="relative mt-12">
        {/* Connector hairline + traveling pulse (desktop only) */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-[5px] hidden h-px overflow-hidden bg-zinc-800 md:block"
        >
          <span className="loop-pulse absolute inset-y-0 left-0 w-[12%]" />
        </div>

        <ol className="reveal-stagger grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.n} className="relative md:pt-8">
              <span
                aria-hidden
                className="absolute left-0 top-0 hidden h-[11px] w-[11px] rounded-full border border-brand/60 bg-[#0a0a0a] md:block"
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                {step.n}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
