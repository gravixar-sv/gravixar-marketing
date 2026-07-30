import Link from "next/link";
import type { Service } from "@/content/schema";

export function ServicesPreview({ services }: { services: Service[] }) {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        what i do
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-section">
        Three things I build. One I keep running.
      </h2>
      <p className="mt-4 max-w-xl text-zinc-400">
        Pick the one that maps to your problem. Every card links to the real
        thing: a system in production, a live demo you can click, or a client
        engagement with the parts that broke written down.
      </p>
      <div className="reveal-stagger mt-10 grid gap-4 md:grid-cols-3">
        {services.map((s, i) => {
          // Four services into a 3-col grid strand the fourth at a third of
          // the width, under a heading that promises three builds and one
          // retainer. So the odd last card runs full-width and splits into
          // two columns: the layout finally renders the 3+1 shape the copy
          // claims. The rule is "remainder 1, above three": a fifth service
          // makes the remainder 2 and this quietly stops firing, and the >3
          // guard keeps a lone service from being blown up into a full-width
          // two-column split.
          const wide =
            services.length > 3 &&
            services.length % 3 === 1 &&
            i === services.length - 1;
          return (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className={`card-surface card-hover-glow group flex flex-col rounded-xl p-6 active:scale-[0.99] ${wide ? "md:col-span-3 md:flex-row md:items-start md:gap-10 md:p-8" : ""}`}
            >
              <div className={wide ? "md:w-[38%] md:shrink-0" : ""}>
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
              </div>
              <div className={wide ? "md:flex-1" : ""}>
                <p
                  className={`mt-3 text-sm leading-relaxed text-zinc-400 ${wide ? "md:mt-0" : ""}`}
                >
                  {s.tagline}
                </p>
                {s.deliverables.length > 0 ? (
                  <ul
                    className={`mt-5 space-y-1.5 text-xs text-zinc-500 ${wide ? "md:grid md:grid-cols-2 md:gap-x-6 md:space-y-0 md:gap-y-1.5" : ""}`}
                  >
                    {/* Fourth line only on the wide card: two columns of two,
                        not a 2+1 orphan inside the card curing an orphan. */}
                    {s.deliverables.slice(0, wide ? 4 : 3).map((d) => (
                      <li key={d} className="flex gap-2">
                        <span className="text-zinc-700 transition-colors group-hover:text-brand-deep">
                          →
                        </span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <span className="link-draw mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 group-hover:text-brand">
                  learn more
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
