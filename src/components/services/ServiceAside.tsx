import Link from "next/link";
import type { Service } from "@/content/schema";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Pairing } from "./body";
import { isExternal, primaryCta, proofLabel, termsFor } from "./model";

// The spec column beside a service's article: what you get, the proof, and
// what it is often paired with, then a small card with the deal and the one
// action, which sticks while the rest of the article scrolls past.
//
// Why only the card sticks and not the whole column: measured at 1440x900,
// six of the seven asides are 840 to 1,360px tall. A sticky element taller
// than the viewport hides its own bottom (here, the proof links) until the
// article ends, which is worse than not sticking. So the lists sit in the flow
// at the top, and once they have scrolled away the offer stays in view for the
// rest of the read instead of leaving a dead column. On phones the card is
// dropped (the header and the closing panel already carry the action), and so
// is "What you get" (the terms strip and the article's own list carry scope),
// so the aside starts at the proof.
//
// Neutral on purpose. Coral is kept for the decision (the card's button), so
// the lists are ivory on hairlines, with human labels instead of the enum
// slugs that used to wrap mid-word ("LIVE-" / "DEMO").

/** A link's text with its trailing arrow glued to the last word, so the arrow can never orphan onto its own line. */
function Tail({ text, external }: { text: string; external: boolean }) {
  const cut = text.lastIndexOf(" ");
  const head = cut > 0 ? text.slice(0, cut + 1) : "";
  const last = cut > 0 ? text.slice(cut + 1) : text;
  return (
    <>
      {head}
      {/* The arrow is inline-block so the link's underline stops at the last
          word instead of running under the gap; nowrap keeps the two together. */}
      <span className="whitespace-nowrap">
        {last}
        <span
          aria-hidden
          className={cn(
            "inline-block pl-[0.35em] text-ink-500 transition-[translate,color] duration-200 group-hover:text-ink-200",
            external
              ? "group-hover:-translate-y-px group-hover:translate-x-px"
              : "group-hover:translate-x-0.5",
          )}
        >
          {external ? "↗" : "→"}
        </span>
      </span>
    </>
  );
}

// Label-sized h2s opt out of the global h1/h2 display treatment (94% width,
// -0.03em), which only suits display sizes; at 13px it read squeezed.
const labelClass = "text-caption font-medium tracking-normal text-ink-400 [font-stretch:100%]";

const rowLink =
  "link-quiet text-[0.9375rem] leading-normal text-ink-100 after:absolute after:inset-0 after:content-['']";

export function ServiceAside({
  meta,
  pairings,
  className,
}: {
  meta: Service;
  pairings: Pairing[];
  className?: string;
}) {
  const price = termsFor(meta)[0];

  return (
    <aside className={cn("flex flex-col", className)} aria-label={`About the ${meta.title}`}>
      <div className="space-y-12">
        {/* Desktop only. On a phone this list landed directly under the
            article's own list of the same offer; there the terms strip and the
            article already cover scope, so the aside starts at the proof. */}
        <section aria-labelledby="svc-get" className="hidden md:block">
          <h2 id="svc-get" className={labelClass}>
            What you get
          </h2>
          <ul className="mt-3 border-t border-line">
            {meta.deliverables.map((d) => (
              <li key={d} className="border-b border-line-soft py-3 text-[0.9375rem] leading-normal text-ink-200">
                {d}
              </li>
            ))}
          </ul>
        </section>

        {meta.proof.length > 0 ? (
          <section aria-labelledby="svc-proof">
            <h2 id="svc-proof" className={labelClass}>
              Proof
            </h2>
            <ul className="mt-3 border-t border-line">
              {meta.proof.map((p) => {
                const external = isExternal(p.href);
                return (
                  <li key={p.href + p.label} className="group relative border-b border-line-soft py-3">
                    <p className="text-caption text-ink-500">{proofLabel(p.kind, p.href)}</p>
                    <p className="mt-0.5">
                      {external ? (
                        <a href={p.href} rel="noreferrer" className={rowLink}>
                          <Tail text={p.label} external />
                        </a>
                      ) : (
                        <Link href={p.href} className={rowLink}>
                          <Tail text={p.label} external={false} />
                        </Link>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {pairings.length > 0 ? (
          <section aria-labelledby="svc-pairs">
            <h2 id="svc-pairs" className={labelClass}>
              Often paired with
            </h2>
            <ul className="mt-3 border-t border-line">
              {pairings.map((p) => (
                <li key={p.href} className="group relative border-b border-line-soft py-3">
                  <Link href={p.href} className={cn(rowLink, "font-medium")}>
                    <Tail text={p.title} external={false} />
                  </Link>
                  {p.reason ? <p className="mt-0.5 text-caption text-ink-500">{p.reason}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="card-surface mt-12 hidden rounded-xl p-5 md:sticky md:top-24 md:block">
        <p className="text-caption text-ink-500">{meta.title}</p>
        {price ? (
          <p className="mt-1 text-lg font-semibold leading-snug text-ink-50">{price.value}</p>
        ) : null}
        <a href="#start" className={cn(buttonClass({ size: "md" }), "group mt-4 w-full")}>
          {primaryCta(meta)}
          <Arrow />
        </a>
      </div>
    </aside>
  );
}
