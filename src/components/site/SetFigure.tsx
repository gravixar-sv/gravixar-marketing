import { Fragment, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import styles from "./SetFigure.module.css";

// A published figure, SET IN TYPE. Each glyph rises out of its own clip,
// staggered left to right: the page-arrival signature (<SetInType>) at glyph
// scale, so a number is typeset in front of the reader.
//
// NEVER A COUNT-UP. The site removed its roll-up on purpose (StatValue.tsx,
// Proof.tsx): a count-up shows numbers nobody counted ("11" on the way to
// "17"), which reads as a gimmick on an audited figure. Here every glyph only
// moves vertically inside its own slot, so every frame shows the published
// figure and nothing else. Commas, spaces and "vs" ride along with the digits.
//
// Server component, pure CSS. The base state is the finished figure; all the
// hiding lives in the animation's backwards fill, so scripting off, an engine
// without scroll timelines, print and reduced motion all show it set.
//
// Accessibility mirrors <SetInType>: the full string is an sr-only twin and
// the split glyphs are aria-hidden, so a screen reader reads "1,560", not
// "1 , 5 6 0". The twin is unselectable, so copying the line yields the
// figure once, not twice.
//
// Triggers:
//   arrival  time based, for a figure in the first viewport. `delay` is the
//            ms before the first glyph moves.
//   scroll   the same choreography on a view timeline, for a figure below the
//            fold: it sets as it scrolls in. Where view() is unsupported it
//            simply sits still.
// `scrollBelow="lg"` keeps an arrival figure on the scroll trigger below lg,
// where the layout stacks and the figure leaves the first viewport.
//
// `enterAt` holds a scroll figure back until its top edge is that many vh
// into the window, for a figure inside a block that is still fading in
// (a <Reveal>), so the glyphs rise after the block is mostly opaque.
//
// `track` reads a named view timeline from an ancestor instead of the
// figure's own. An overflow-hidden frame is a scroll container, and a view
// timeline declared inside one watches that (unscrollable) frame and never
// runs, so a figure inside such a frame must read the frame's timeline. The
// range is given as percentages of the ancestor's entry range.

const RISE_MS = 620; // one glyph's rise; the module CSS repeats it (620ms, + 620)
const STEP_MS = 28; // glyph to glyph
// Cap on first-to-last start, so a long figure settles in about 700ms: the
// last glyph is visually home ~260ms into its rise on the expo curve.
const SPREAD_MS = 440;

type Track = { timeline: `--${string}`; from: number; to: number };

export function SetFigure({
  text,
  trigger = "scroll",
  delay = 0,
  scrollBelow,
  enterAt,
  track,
  quiet = false,
  className,
}: {
  text: string;
  trigger?: "arrival" | "scroll";
  /** arrival: ms before the first glyph moves */
  delay?: number;
  /** arrival only: below this breakpoint use the scroll trigger instead */
  scrollBelow?: "lg";
  /** scroll: vh the figure's top edge travels into the window before the first glyph moves (default 3) */
  enterAt?: number;
  /** scroll: read an ancestor's named view timeline over [from, to]% of its entry range */
  track?: Track;
  /** a body-size figure inside a sentence: a short lift with a fade, no clip */
  quiet?: boolean;
  className?: string;
}) {
  const chars = Array.from(text);
  const step = chars.length > 1 ? Math.min(STEP_MS, SPREAD_MS / (chars.length - 1)) : 0;

  // Words stay unbreakable (a line may only wrap at a space, as it did when
  // this was plain text) and each glyph's start is its position in the whole
  // string, spaces included, so the wave crosses the figure at an even pace.
  let pos = 0;
  const tokens = text
    .split(/(\s+)/)
    .filter((s) => s.length > 0)
    .map((s) => {
      const start = pos;
      const glyphs = Array.from(s);
      pos += glyphs.length;
      return { space: /^\s+$/.test(s), text: s, glyphs, start };
    });

  const mode =
    trigger === "scroll" ? styles.scroll : scrollBelow === "lg" ? styles.arriveLg : styles.arrive;
  const vars: Record<string, string | number> = {};
  if (trigger === "arrival") vars["--sf-d"] = delay;
  if (enterAt !== undefined) vars["--sf-a"] = `${enterAt}vh`;
  if (track) {
    vars["--sf-tl"] = track.timeline;
    vars["--sf-a"] = `${track.from}%`;
    // 1ms of the arrival choreography in percent of the ancestor's entry
    // range, sized so the longest possible figure finishes at `to`.
    vars["--sf-k"] = `${((track.to - track.from) / (SPREAD_MS + RISE_MS)).toFixed(4)}%`;
  }

  return (
    <span className={cn(styles.root, mode, quiet && styles.quiet, className)} style={vars as CSSProperties}>
      <span className="sr-only select-none">{text}</span>
      <span aria-hidden>
        {tokens.map((tok) =>
          tok.space ? (
            <Fragment key={tok.start}>{tok.text}</Fragment>
          ) : (
            <span key={tok.start} className={styles.word}>
              {tok.glyphs.map((g, i) => (
                <span key={i} className={styles.clip}>
                  <span
                    className={styles.glyph}
                    style={{ "--t": Math.round((tok.start + i) * step) } as CSSProperties}
                  >
                    {g}
                  </span>
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
