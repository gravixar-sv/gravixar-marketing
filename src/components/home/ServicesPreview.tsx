import Link from "next/link";
import type { Service } from "@/content/schema";

// BANDS, NOT INDEX ARITHMETIC.
// Every service carries a track: something I build (scoped, with an end date),
// something I keep honest after it ships (a retainer where I make the calls),
// or something I keep running (someone else's stack, maintained). Each track
// renders as its own 12-column band, and every card in a band spans
// 12 / (cards in that band), so a band divides exactly and always fills its
// row. Today that is three builds at span 4 (the same thirds this section has
// always drawn), two ongoing at span 6, and one maintain at span 12.
//
// What was here before: a `wide` flag that ran the last card full-width when
// services.length % 3 === 1. It read the count instead of the meaning, so the
// day a fifth service shipped the remainder became 2, the flag went quiet with
// no error, and the section rendered three cards plus two orphans. The span now
// comes from what a service IS. Add a service, give it a track, and the band
// re-divides itself. Do not bring modular arithmetic back here.
//
// Tailwind v4 builds its stylesheet by scanning source text for class names, so
// `md:col-span-${n}` compiles to nothing at all: the class has to exist in the
// file as a literal string. Hence the map instead of a template.
const BAND_SPAN: Record<number, string> = {
  1: "md:col-span-12",
  2: "md:col-span-6",
  3: "md:col-span-4",
  4: "md:col-span-3",
  6: "md:col-span-2",
  12: "md:col-span-1",
};

// A band size that does not divide 12 (five, seven) cannot fill a row by any
// arrangement. It falls back to thirds and wraps, which is obvious enough on
// screen to go fix, rather than a silent misrender.
const UNEVEN_BAND_SPAN = "md:col-span-4";

// Three deliverables per card, at every span. Each service file carries five or
// six, so three never leaves a card visibly short, and one fixed count keeps
// the cards inside a band within a line of each other in height. The old fourth
// line existed only because the full-width card had two interior columns to
// fill; at a third or a half of the row the list is single-column, so a fourth
// item just makes one card taller than the card beside it.
const DELIVERABLES_SHOWN = 3;

type Card = { service: Service; number: string };
type Band = { track: Service["track"]; cards: Card[] };

// Bands come out in order of first appearance, and loadServices sorts by the
// frontmatter `order`, so builds (1-3) precede ongoing (4-5) without this
// function knowing either track name. A track's cards group together even if
// the orders interleave, so a mis-ordered file can shuffle the bands but can
// never split one.
function toBands(services: Service[]): Band[] {
  const bands: Band[] = [];
  services.forEach((service, i) => {
    // The number is the position in the whole menu, not inside the band: the
    // reader counts straight down through every card, because the split is
    // about how an engagement runs, not the start of a second list.
    const card: Card = { service, number: String(i + 1).padStart(2, "0") };
    const band = bands.find((b) => b.track === service.track);
    if (band) band.cards.push(card);
    else bands.push({ track: service.track, cards: [card] });
  });
  return bands;
}

export function ServicesPreview({ services }: { services: Service[] }) {
  const bands = toBands(services);
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        what i do
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] md:text-section">
        What I build, what I keep honest after it ships, and what I keep
        running.
      </h2>
      <p className="mt-4 max-w-xl text-zinc-400">
        Pick the one that maps to your problem. Every card links to the real
        thing: a system in production, a live demo you can click, or a client
        engagement with the parts that broke written down.
      </p>
      {/* One menu read in bands, so spacing carries the split instead of a
          label: 16px inside a band, 32px between them. The card widths say it a
          second time, stepping thirds to halves to full as the commitment
          changes, which is why the band rule is worth more than a heading per
          group. On mobile the spans go inert and only the 2:1 gap ratio is
          left, which is thinner but still legible. */}
      <div className="mt-10 space-y-8">
        {bands.map((band) => {
          const span = BAND_SPAN[band.cards.length] ?? UNEVEN_BAND_SPAN;
          return (
            // reveal-stagger per band rather than one wrapper for all five
            // cards: the CSS ladder offsets direct children on a mod-3 cycle so
            // a row's cards arrive left to right, and a band that starts its
            // own count gets that beat at whatever width it happens to be.
            <div
              key={band.track}
              className="reveal-stagger grid gap-4 md:grid-cols-12"
            >
              {band.cards.map(({ service, number }) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className={`card-surface card-hover-glow group flex flex-col rounded-xl p-6 active:scale-[0.99] ${span}`}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 group-hover:text-brand">
                      {service.bucket}
                    </p>
                    <span className="font-mono text-[10px] text-zinc-700">
                      {number}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-zinc-100">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {service.tagline}
                  </p>
                  {service.deliverables.length > 0 ? (
                    <ul className="mt-5 space-y-1.5 text-xs text-zinc-500">
                      {service.deliverables
                        .slice(0, DELIVERABLES_SHOWN)
                        .map((d) => (
                          <li key={d} className="flex gap-2">
                            <span className="text-zinc-700 transition-colors group-hover:text-brand-deep">
                              →
                            </span>
                            <span>{d}</span>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  {/* self-start, because the card is a flex column and a
                      stretched item would draw the link-draw underline across
                      the whole card instead of under the two words. */}
                  <span className="link-draw mt-6 self-start font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 group-hover:text-brand">
                    learn more
                  </span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
