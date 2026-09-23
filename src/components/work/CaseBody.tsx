import type { CSSProperties, ReactNode } from "react";
import { MDX } from "@/content/mdx";
import type { CaseStudy } from "@/content/schema";
import { cn } from "@/lib/cn";
import styles from "./CaseBody.module.css";
import { paragraphs, type BodyChunk } from "./model";

// The reading column of a case study: the short story first (three plain
// sections from the frontmatter), then "the long version" from the MDX body,
// with any "What broke" section set apart as an inset. Every section is a
// named view timeline so the rail's index can light the one being read; the
// sections butt up against each other (padding, not margins) so the lit link
// hands straight from one to the next.

export type ShortSection = { id: string; title: string; body: string };

const H2 =
  "scroll-mt-28 text-[1.625rem] font-semibold leading-[1.18] tracking-[-0.02em] text-ink-50 md:text-subsection";

function timeline(name: string): CSSProperties {
  return { viewTimelineName: name } as CSSProperties;
}

export function CaseBody({
  short,
  chunks,
  testimonial,
  timelines,
}: {
  short: ShortSection[];
  chunks: BodyChunk[];
  testimonial: CaseStudy["testimonial"];
  /** one view-timeline name per section, short sections first */
  timelines: string[];
}) {
  // "The long version" promises depth, so it only opens when there is some:
  // two or more sections, or one long one. A lone short "What's next" follows
  // "What changed" directly.
  const words = chunks.reduce((n, c) => n + c.source.split(/\s+/).length, 0);
  const longVersion = chunks.length >= 2 || words > 150;
  return (
    <>
      {short.map((s, i) => (
        <section key={s.id} style={timeline(timelines[i]!)} className={i === 0 ? undefined : "pt-14 md:pt-16"}>
          <h2 id={s.id} className={H2}>
            {s.title}
          </h2>
          {paragraphs(s.body).map((p, j) => (
            <p key={j} className={cn("text-prose text-ink-300", j === 0 ? "mt-4" : "mt-5")}>
              {p}
            </p>
          ))}
          {i === short.length - 1 && testimonial ? <Testimonial {...testimonial} /> : null}
        </section>
      ))}

      {chunks.map((c, i) => {
        const name = timelines[short.length + i]!;
        const lead = i === 0 && longVersion ? <LongVersion /> : null;
        if (c.broke) {
          return (
            <section key={c.id ?? i} style={timeline(name)} className="pt-14 md:pt-16">
              {lead}
              <Broke>
                <MDX source={c.source} />
              </Broke>
            </section>
          );
        }
        return (
          <section key={c.id ?? i} style={timeline(name)} className="pt-14 md:pt-16">
            {lead}
            <div>
              <MDX source={c.source} />
            </div>
          </section>
        );
      })}
    </>
  );
}

// The hand-off from the short story to the detail: one deliberate break
// instead of a heading stacked on a heading.
function LongVersion() {
  return (
    <div className="mb-14 flex items-center gap-4 pt-6 md:mb-16 md:pt-8">
      <span className="text-caption text-ink-500">The long version</span>
      <span aria-hidden className="rule-draw rule-draw-scroll h-px flex-1" />
    </div>
  );
}

// "What broke" is the most honest writing on the site, so it gets its own
// setting: a flat lit surface with an ivory hairline along its top edge, and
// a small caption. No coral: coral marks a human decision, and a callout edge
// is decoration. Not a card in a card: the reading column is not a card.
//
// The bleed stays inside main's 24px gutter (20px) until the container has
// side margin of its own (xl, 1280px and up), so the inset never clips or
// scrolls sideways between 640 and 1279px.
function Broke({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "card-surface relative rounded-2xl px-5 pb-8 pt-7 sm:-mx-5 sm:pb-10 sm:pt-9 xl:-mx-8 xl:px-8",
        styles.broke,
      )}
    >
      <span aria-hidden className={styles.brokeLine} />
      <p className="mb-5 text-caption text-ink-300">The honest section</p>
      <div>{children}</div>
    </div>
  );
}

// A client quote ships only with written consent (see the schema). When one
// exists it is a serif pull quote with a hanging mark, never a side stripe.
function Testimonial({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <figure className="mt-12">
      <blockquote className="relative pl-7 font-serif text-[1.5rem] italic leading-[1.4] text-ink-100 md:text-[1.75rem]">
        <span aria-hidden className="absolute -top-1 left-0 font-serif text-[2.5rem] leading-none text-ink-600">
          &ldquo;
        </span>
        {quote}
      </blockquote>
      <figcaption className="mt-4 pl-7 text-caption text-ink-400">{attribution}</figcaption>
    </figure>
  );
}
