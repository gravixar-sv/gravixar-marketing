"use client";

import { useEffect, useState } from "react";

// The compressed, working version of the Loop section two screens down. The
// thesis above the fold is "asks before it acts", and until now the fold only
// asserted it: the panel held a four-tile persona grid that described what a
// visitor could DO in the demo instead of doing anything. A strip that runs the
// loop earns the same real estate honestly. It also retires a hand-maintained
// mirror of the demo's persona list, which is exactly the kind of copy that
// drifts: three of its four tiles resolved to the same scene, and an earlier
// version of it promised an admin persona the demo does not have. The demo's
// own scene list stays the demo's job.
//
// Language is lifted from Loop.tsx on purpose (its titles, and its "every write
// waits for a click from someone accountable" / "each approval tightens the rule
// the next draft follows"), so the two surfaces cannot drift into saying
// different things about the same mechanism. Edit both or neither.
//
// BASE VISIBILITY, the rule this component is most likely to break. Every row,
// every payoff, the drafted line and the control are server-rendered at full
// emphasis. Hydration adds exactly one thing: `mounted`, which lets .approval-step
// de-emphasise row 03 by OPACITY alone. Nothing is revealed on click, so with
// scripting off, a failed hydration, or a frozen tab, the strip still reads as a
// correct and complete description of the loop. Same contract as <Reveal> and
// <StatValue>: the server renders the resolved state, the client only enhances.
const STEPS = [
  {
    n: "01",
    title: "The agent drafts",
    body: "Full context from your stack, not a blank prompt.",
    // Illustrative, and captioned as such under the strip. It quotes nothing a
    // client said, names nobody, and carries no number, because a made-up
    // figure on the fold is the one lie this panel cannot afford.
    // The prefix is what the click changes: the write was HELD, and approving
    // releases it. That is the one upstream consequence that turns this from a
    // state change into cause and effect, because the row you clicked is not
    // the row that moves. "held" and "sent" are both four characters and the
    // span is width-locked anyway, so the swap cannot move the wrap point.
    artifact: "reply to a new inquiry, scope and start date attached",
  },
  {
    n: "02",
    title: "A human approves",
    body: "Every write waits for a click from someone accountable.",
  },
  {
    n: "03",
    title: "The rule tightens",
    body: "Each approval tightens the rule the next draft follows.",
  },
] as const;

export function ApprovalStrip() {
  const [mounted, setMounted] = useState(false);
  const [approved, setApproved] = useState(false);

  // Not a content gate. It buys one thing: the right to de-emphasise the step
  // that has not happened yet, which is only meaningful once the click that
  // completes it is actually possible.
  useEffect(() => setMounted(true), []);

  return (
    <div className="mt-5">
      <p className="font-mono text-label-sm uppercase text-muted">
        the approval loop
      </p>

      <ol className="mt-3 space-y-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            // Absent on the server, so the first paint is all three rows at
            // full emphasis and no engine can resolve this to hidden content.
            data-dimmed={
              mounted && !approved && step.n === "03" ? "true" : undefined
            }
            className="approval-step"
          >
            <div className="flex items-baseline gap-2">
              {/* Decorative: the ordered list carries the sequence, and the
                  labels read in order without the digits. */}
              <span
                aria-hidden
                className="font-mono text-label-sm uppercase text-zinc-400"
              >
                {step.n}
              </span>
              <p className="text-sm font-medium text-zinc-100">{step.title}</p>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-zinc-300">
              {step.body}
            </p>

            {step.n === "01" ? (
              <p className="mt-1.5 font-mono text-[10px] leading-snug text-zinc-400">
                {/* Width-locked so a four-to-four character swap still cannot
                    reflow the line, and colour-only on the transition, because
                    the whole point of the fixed slot below is that nothing in
                    this strip moves vertically after hydration. */}
                <span
                  className={`inline-block w-[4ch] transition-colors duration-200 ease-out ${
                    approved ? "text-emerald-300" : "text-muted"
                  }`}
                >
                  {approved ? "sent" : "held"}
                </span>
                <span aria-hidden className="text-zinc-600"> · </span>
                {step.artifact}
              </p>
            ) : null}

            {step.n === "02" ? (
              <>
                {/* FIXED-HEIGHT CONTROL SLOT. h-7 is declared on this box, so
                    its height is 28px whatever it holds: the button is h-7 too,
                    whitespace-nowrap, and the reset that appears after a click
                    is text on the same 28px flex line. The server markup and the
                    post-mount markup are byte-identical here (nothing about this
                    slot reads `mounted`), so hydration on the LCP surface shifts
                    nothing; the click only changes labels horizontally inside a
                    box whose height is already resolved. */}
                <div className="mt-2 flex h-7 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!approved) setApproved(true);
                    }}
                    // aria-disabled, not disabled: `disabled` would drop focus
                    // off the control the visitor just pressed, and the button
                    // has to stay in the tab order for the reset beside it to
                    // make sense.
                    aria-disabled={approved || undefined}
                    // min-w sized to the longer label, so the box does not
                    // contract when "Approve the draft" becomes "Approved".
                    // Without it the button snapped narrower while row 03 was
                    // still fading, and the snap pulled the eye BACK to the
                    // control instead of forward to the row that changed.
                    className={`inline-flex h-7 min-w-[7.5rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[11px] font-medium transition-colors duration-200 ease-out ${
                      approved
                        ? // No emerald dot here on purpose: the panel's chrome
                          // already wears a dot-and-pill for "live", and cloning
                          // it would let an illustrative control claim the same
                          // status as the real badge 200px above it.
                          "border-emerald-500/25 text-emerald-300"
                        : // Zinc at rest, coral on interaction. Resting coral on
                          // this fold belongs to "Book a call"; the real
                          // secondary action next to it is a zinc outline that
                          // earns coral on hover. A control inside an
                          // illustrative panel must not outrank either, so it
                          // takes the secondary treatment exactly. The active
                          // colour shift carries the press on its own, since
                          // scale is separately reset under reduced motion.
                          "border-zinc-700 text-zinc-100 hover:border-brand hover:text-brand-soft active:scale-[0.98] active:border-brand active:bg-brand/15"
                    }`}
                  >
                    {approved ? "Approved" : "Approve the draft"}
                  </button>

                  {approved ? (
                    <button
                      type="button"
                      onClick={() => setApproved(false)}
                      className="whitespace-nowrap font-mono text-label-sm uppercase text-muted transition-colors duration-200 ease-out hover:text-zinc-300"
                    >
                      {/* Short on screen, complete to a screen reader, and the
                          visible words are the start of the accessible name, so
                          voice control still matches what is drawn. The label is
                          kept this terse for a layout reason too: both controls
                          are nowrap on one 28px line, so together they feed the
                          panel's min-content width. Measured, they come to 180px
                          against the 258px the panel's chrome row already
                          demands, so the strip is not what the panel narrows to;
                          "run the loop again" made it 279px and would have put a
                          horizontal scrollbar on a 320px screen. */}
                      run it again
                      <span className="sr-only"> from the draft</span>
                    </button>
                  ) : null}
                </div>

                {/* aria-live rather than aria-pressed: this is not a two-state
                    toggle, it is a one-way step whose effect lands on ANOTHER
                    row, and aria-pressed would announce a pressed control while
                    saying nothing about what changed. A screen reader never saw
                    row 03 de-emphasised, so the honest announcement is the
                    outcome, in the same words the row uses. Empty and present
                    on the server, so the region is registered before it fills. */}
                <p className="sr-only" aria-live="polite">
                  {approved
                    ? "Draft approved. The rule tightens, and the next draft follows it."
                    : ""}
                </p>
              </>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[10px] leading-snug text-muted">
        Illustrative sample data, not a live system.
      </p>
    </div>
  );
}
