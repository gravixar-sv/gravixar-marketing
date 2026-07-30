"use client";

import { useEffect, useRef, useState } from "react";

// Rolls a stat up from zero the first time it scrolls into view. The
// server renders the final value, so with scripting off (or reduced
// motion) the real number is simply there; the roll-up is enhancement.
// Handles compound values like "9 / 5" by animating each digit run.
//
// CORRECTNESS BEFORE MOTION, and this is the only place on the page where the
// two can disagree. Everywhere else a stalled animation costs a fade; here it
// costs the truth, because a roll parked at 60% shows "17" as "11" and "24" as
// "9", directly under a label printing the date these figures were counted. A
// number that is wrong reads worse than a number that never moved. So every
// exit from the roll writes `value` itself rather than whatever the
// interpolation last produced:
//   - the last tick writes the string instead of recomputing it, so no easing
//     or rounding state can be the final thing on screen;
//   - the tab going hidden settles at once, since a roll nobody is watching has
//     nothing left to earn;
//   - a timer settles it regardless of the frame loop. That one is the
//     load-bearing guarantee. A page that has stopped compositing gets ZERO
//     requestAnimationFrame callbacks while setTimeout keeps firing, which is
//     the exact shape of the freeze this repo has already hit twice, so rAF is
//     not allowed to be its own watchdog. Same instinct as the rescue timer in
//     <Reveal>: the correct state must not depend on a ticker surviving.
export function StatValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    // Ahead of every early return below, so a finished roll of a previous
    // `value` can never outlive the prop that produced it.
    setDisplay(value);

    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const segments = value.split(/(\d+)/);
    if (!segments.some((s) => /^\d+$/.test(s))) return;

    let raf = 0;
    let watchdog = 0;
    let stopped = false;
    const listeners = new AbortController();

    // Teardown that leaves the text alone. Unmount takes this path: there is
    // nothing to resolve for a visitor who is already gone.
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(watchdog);
      listeners.abort();
    };

    // The only way the roll ends with something on screen. Idempotent, because
    // the frame, the timer and the visibility handler can each get here first
    // and all three write the same string.
    const settle = () => {
      if (stopped) return;
      stop();
      setDisplay(value);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
          const t = (now - start) / duration;
          if (t >= 1) {
            settle();
            return;
          }
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(
            segments
              .map((s) =>
                /^\d+$/.test(s) ? String(Math.round(Number(s) * eased)) : s,
              )
              .join(""),
          );
          raf = requestAnimationFrame(tick);
        };
        document.addEventListener(
          "visibilitychange",
          () => {
            if (document.hidden) settle();
          },
          { signal: listeners.signal },
        );
        // Armed here and not on mount, because the roll can start seconds after
        // hydration and this deadline is measured from `start`. The slack over
        // `duration` only has to outlast one late frame: a loop that is alive at
        // all has already settled itself by then, so this firing at all means
        // the frames stopped coming.
        watchdog = window.setTimeout(settle, duration + 300);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
