import { ViewTransition, type ReactNode } from "react";
import { SetInType } from "./SetInType";
import { cn } from "@/lib/cn";

// The opening of every inner page. It arrives the way the homepage does: the
// h1 sets in type word by word, the lede rises after it, and the closing
// hairline draws from the left. All CSS, so it renders without JS and holds
// still under reduced motion.
//
// eyebrow is wayfinding, not decoration: a quiet sans caption (often a link
// back to the index via `eyebrowHref`), never coral mono.
//
// titleTransition names the h1 for a shared-element morph from the card the
// visitor clicked (e.g. `svc-${slug}` on both the services card and here).
// When set, the h1 renders as plain text: a morph and a word reveal on the same
// element would fight.
export function PageHeader({
  eyebrow,
  eyebrowHref,
  title,
  accent,
  lede,
  titleTransition,
  children,
  className,
  rule = true,
}: {
  eyebrow?: ReactNode;
  eyebrowHref?: string;
  title: string;
  /** trailing phrase set in the serif human voice; use sparingly */
  accent?: string;
  lede?: ReactNode;
  titleTransition?: string;
  /** actions, a terms strip, or anything that belongs to the opening */
  children?: ReactNode;
  className?: string;
  rule?: boolean;
}) {
  const titleClass = "mt-4 max-w-[22ch] text-page font-semibold text-ink-50";
  return (
    <header className={cn("pb-10 md:pb-14", rule && "rule-draw", className)}>
      {eyebrow ? (
        <p className="hero-enter text-caption text-ink-400">
          {eyebrowHref ? (
            <a href={eyebrowHref} className="group inline-flex items-center gap-2 transition-colors hover:text-ink-100">
              <span aria-hidden className="transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5">
                ←
              </span>
              {eyebrow}
            </a>
          ) : (
            eyebrow
          )}
        </p>
      ) : null}
      {titleTransition ? (
        <ViewTransition name={titleTransition} share="morph-title" default="none">
          <h1 className={titleClass}>
            {title}
            {accent ? (
              <>
                {" "}
                <em className="voice">{accent}</em>
              </>
            ) : null}
          </h1>
        </ViewTransition>
      ) : (
        <SetInType text={title} accent={accent} className={titleClass} delay={60} />
      )}
      {lede ? (
        <div className="hero-enter mt-5 max-w-[60ch] text-lead text-ink-300 [animation-delay:220ms]">
          {lede}
        </div>
      ) : null}
      {children ? <div className="hero-enter mt-8 [animation-delay:300ms]">{children}</div> : null}
    </header>
  );
}
