import Link from "next/link";

export function ContactCTA() {
  return (
    <section className="live-panel relative overflow-hidden rounded-2xl p-10 md:p-14">
      {/* Subtle ambient gradient */}
      <div
        aria-hidden
        className="bg-brand-glow pointer-events-none absolute inset-0 -z-0 opacity-60"
      />
      <div className="relative z-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
          next step
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
          Bring me a real operations problem. I&apos;ll show you the system before
          you sign anything.
        </h2>
        <p className="mt-4 max-w-2xl text-zinc-400">
          30-minute discovery call. If we&apos;re not a fit, you walk with notes
          you can use anyway.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-brand-deep/20 transition-all hover:bg-brand-soft hover:shadow-xl hover:shadow-brand-deep/30"
          >
            Book a call
          </Link>
          <Link
            href="/work"
            className="group rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
          >
            Read what I&apos;ve shipped
            <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
