import { Fragment, type CSSProperties } from "react";

// "Set in type": the page-arrival signature. Each word of a headline rises out
// of its own clip (.sit-w in globals.css). Server component, pure CSS, so the
// headline renders with scripting off and reduced motion shows it static.
//
// Accessibility: the visible split copy is aria-hidden and an sr-only twin
// carries the sentence, so a screen reader reads one string, not N words.
//
// `accent` renders a trailing phrase in the serif human voice (.voice), for
// the one headline per page that earns it. It is split and animated with the
// rest so the line settles as one gesture.
type Tag = "h1" | "h2" | "h3" | "p" | "span";

export function SetInType({
  as: Component = "h1",
  text,
  accent,
  className,
  delay = 40,
  id,
}: {
  as?: Tag;
  text: string;
  accent?: string;
  className?: string;
  /** ms before the first word moves */
  delay?: number;
  id?: string;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const accentWords = accent ? accent.split(/\s+/).filter(Boolean) : [];
  const total = words.length + accentWords.length;

  const render = (list: string[], offset: number) =>
    list.map((w, i) => (
      <Fragment key={offset + i}>
        <span className="sit-w">
          <span style={{ "--i": Math.min(i + offset, 14) } as CSSProperties}>{w}</span>
        </span>
        {i + offset < total - 1 ? " " : null}
      </Fragment>
    ));

  return (
    <Component id={id} className={className}>
      <span className="sr-only">{accent ? `${text} ${accent}` : text}</span>
      <span aria-hidden style={{ "--sit-d": `${delay}ms` } as CSSProperties}>
        {render(words, 0)}
        {/* align-top: the serif's taller inline box otherwise stretches the
            line it sits on, so a mixed headline stepped 82/82/94px. */}
        {accentWords.length > 0 ? (
          <em className="voice align-top">{render(accentWords, words.length)}</em>
        ) : null}
      </span>
    </Component>
  );
}
