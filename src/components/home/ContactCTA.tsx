import Link from "next/link";

export function ContactCTA() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-10 md:p-14">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">
        next step
      </p>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
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
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-black hover:bg-brand-soft"
        >
          Book a call
        </Link>
        <Link
          href="/work"
          className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 hover:border-brand hover:text-brand-soft"
        >
          Read what I&apos;ve shipped
        </Link>
      </div>
    </section>
  );
}
