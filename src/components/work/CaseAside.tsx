import type { CSSProperties } from "react";
import { Arrow } from "@/components/ui/Button";
import type { CaseStudy } from "@/content/schema";
import { cn } from "@/lib/cn";
import styles from "./CaseAside.module.css";

export type TocItem = { id: string; title: string; timeline: string };

// The right rail of a case study. On desktop it holds a section index (plain
// anchors to the h2 ids, so it works with scripting off) and the demo link,
// and it only sticks when it fits under the header: a sticky rail taller than
// the window hides its own bottom. "Built with" sits after the sticky block,
// not in it, so the block stays short enough to stick on a 657px-tall laptop.
// On phones the index and demo link move up the page into <PageIndex> and
// only "Built with" remains here, at the end of the article.
//
// The index lights the section being read without JS: each section is a named
// view timeline and each link animates only while its section crosses the
// reading line (see the module). Engines without scroll timelines simply
// show the list unlit.
export function CaseAside({
  toc,
  demo,
  stack,
}: {
  toc: TocItem[];
  demo: CaseStudy["demo"];
  stack: string[];
}) {
  // Height estimate for the sticky block: label + rows (long titles wrap) +
  // demo block. Rough on purpose; the bands are wide.
  const tocRows = toc.reduce((n, t) => n + (t.title.length > 28 ? 2 : 1), 0);
  const est = 40 + tocRows * 26 + (demo ? 130 : 0);
  const fit = est < 420 ? styles.fitsShort : est < 540 ? styles.fitsMedium : styles.fitsTall;
  const hasRail = toc.length > 0 || Boolean(demo);

  return (
    <aside className={cn("min-w-0", styles.aside)}>
      {hasRail ? (
        <div className={cn("hidden lg:block", fit)}>
          {toc.length > 0 ? (
            <nav aria-label="On this page">
              <p className="text-caption text-ink-500">On this page</p>
              <ol className="mt-3 border-l border-line-soft">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={cn(
                        "-ml-px block border-l border-transparent py-1.5 pl-4 text-sm leading-snug text-ink-400 transition-colors hover:text-ink-100",
                        styles.tocLink,
                      )}
                      style={{ "--tl": t.timeline } as CSSProperties}
                    >
                      {t.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          {demo ? (
            <div className="mt-10 border-t border-line-soft pt-6">
              <p className="text-caption text-ink-500">Try the demo version</p>
              <DemoLink label={demo.label} href={demo.href} />
              {/* The demo label already says "sample data". */}
              <p className="mt-2 font-mono text-label-xs text-ink-500">not the client&apos;s system</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {stack.length > 0 ? (
        <div className={cn("border-t border-line-soft pt-6", hasRail && "lg:mt-10")}>
          <p className="text-caption text-ink-500">Built with</p>
          <p className="mt-2 text-caption text-ink-300">{stack.join(", ")}</p>
        </div>
      ) : null}
    </aside>
  );
}

// Below lg there is no rail, and a phone page runs ten screens or more. This
// folds the same index (and the demo link, when there is one) into one quiet
// disclosure right under "At a glance". No script: <details> opens itself and
// the anchors land on the h2s, which already carry scroll margin.
export function PageIndex({ toc, demo }: { toc: TocItem[]; demo: CaseStudy["demo"] }) {
  if (toc.length === 0 && !demo) return null;
  return (
    <details className={cn("border-b border-line-soft lg:hidden", styles.index)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-caption text-ink-300 [&::-webkit-details-marker]:hidden">
        On this page
        <svg aria-hidden viewBox="0 0 12 12" className={cn("size-3 text-ink-500", styles.caret)} fill="none">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-5">
        {toc.length > 0 ? (
          <nav aria-label="On this page">
            <ol className="border-l border-line-soft">
              {toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="-ml-px flex min-h-11 items-center border-l border-transparent pl-4 text-[0.9375rem] leading-snug text-ink-300 active:text-ink-50"
                  >
                    {t.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {demo ? (
          <div className={cn(toc.length > 0 && "mt-4 border-t border-line-soft pt-4")}>
            <p className="text-caption text-ink-500">Try the demo version</p>
            <DemoLink label={demo.label} href={demo.href} />
            <p className="mt-2 font-mono text-label-xs text-ink-500">not the client&apos;s system</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

// The arrow travels with the label's last word, so a wrapped label never
// strands it at the far edge of the rail.
function DemoLink({ label, href }: { label: string; href: string }) {
  const words = label.split(" ");
  const last = words.pop() ?? "";
  return (
    <a href={href} rel="noreferrer" className="group mt-1 block py-1 text-[0.9375rem] leading-snug text-ink-100">
      <span className="link-draw">{words.join(" ")} </span>
      <span className="whitespace-nowrap">
        <span className="link-draw">{last}</span> <Arrow external />
      </span>
    </a>
  );
}
