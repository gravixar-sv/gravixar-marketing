import Link from "next/link";
import type { Service } from "@/content/schema";

export function ServicesPreview({ services }: { services: Service[] }) {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        what i do
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-4xl">
        Three things I build. One I keep running.
      </h2>
      <p className="mt-4 max-w-2xl text-zinc-400">
        Pick the one that maps to your problem. Every card links to the real
        thing: a system in production, a live demo you can click, or a client
        engagement with the parts that broke written down.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {services.map((s, i) => (
          <Link
            key={s.slug}
            href={`/services/${s.slug}`}
            className="card-surface card-hover-glow group flex flex-col rounded-xl p-6"
          >
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                {s.bucket}
              </p>
              <span className="font-mono text-[10px] text-zinc-700">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-zinc-100">
              {s.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {s.tagline}
            </p>
            {s.deliverables.length > 0 ? (
              <ul className="mt-5 space-y-1.5 text-xs text-zinc-500">
                {s.deliverables.slice(0, 3).map((d) => (
                  <li key={d} className="flex gap-2">
                    <span className="text-brand-deep">→</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <span className="link-draw mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 group-hover:text-brand">
              learn more
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
