"use client";

import { useEffect, useRef, useState } from "react";
import { LOOP_STEPS } from "./hero/loopSteps";
import styles from "./ApprovalStrip.module.css";

// The approval card on the homepage fold: the thesis ("asks before it acts")
// as something you can do, not something you are told. It sits on the lower
// left edge of the 3D loop and is wired to it both ways (see HeroStage.tsx):
// Approve here releases the lead draft at the scene's gate, and approving at
// the gate in the scene flips this card.
//
// Step titles come from ./hero/loopSteps.ts, the same module Loop.tsx prints,
// so the fold and "how it works" cannot drift into saying different things
// about the same mechanism. The card prints TITLES ONLY, at every width: the
// Loop section one scroll below is the one place the three explanatory
// sentences appear. Printing them here too put the same 40 words on screen
// twice, 80px apart.
//
// BASE VISIBILITY, the rule this component is most likely to break. Every
// step, the chip and the control are server-rendered at full emphasis.
// Hydration adds exactly one thing, data-armed, which lets step 3 wait by
// OPACITY alone until someone approves. Nothing is revealed by a click, so
// with scripting off, a failed hydration or a frozen tab the card still reads
// as a correct and complete description of the loop.
//
// The count ("3 drafts waiting") comes from the scene's queue while nothing
// is approved. Once someone approves, the same slot shows the static result,
// "1 sent", until they run it again: the scene keeps delivering new drafts to
// the gate, and a count that climbs back to 5 under "Approved" read as the
// click having done nothing. Neither is a live region: the queue would be
// noise, and the approval itself is announced once, below.

type Props = {
  approved: boolean;
  /** Drafts held at the gate, from the scene. */
  held: number;
  onApprove: () => void;
  onReset: () => void;
  className?: string;
};

// A plain joiner, not cn(): tailwind-merge (unconfigured) reads the custom
// size utilities (text-caption, text-label-sm) as colours and drops them when
// a text colour follows in the same call.
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

function waitingLabel(held: number) {
  if (held <= 0) return "nothing waiting";
  if (held === 1) return "1 draft waiting";
  return `${held} drafts waiting`;
}

export function ApprovalStrip({ approved, held, onApprove, onReset, className }: Props) {
  const [armed, setArmed] = useState(false);
  const [live, setLive] = useState(false);
  const approveRef = useRef<HTMLButtonElement>(null);

  // Not a content gate. It buys the right to de-emphasise the step that has
  // not happened yet, which only means something once the click that
  // completes it can actually happen.
  useEffect(() => setArmed(true), []);

  // Transitions switch on in the SAME render as the first approval, whether
  // the click came from this card or from the gate in the scene. A transition
  // uses the after-change style's timing, so flipping data-live and
  // data-approved together still animates; setting live in an effect would
  // land one render late and the first approval from the scene would snap.
  if (approved && !live) setLive(true);

  return (
    <div
      role="group"
      aria-labelledby="approval-card-title"
      data-armed={armed || undefined}
      data-live={live || undefined}
      data-approved={approved || undefined}
      className={cx(styles.card, "panel-lit rounded-2xl p-5 sm:p-6 lg:p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p id="approval-card-title" className="text-caption font-medium text-ink-200">
          The approval loop
        </p>
        <p className="font-mono text-label-sm tabular-nums text-ink-400">
          {approved ? "1 sent" : waitingLabel(held)}
        </p>
      </div>

      <ol className="mt-5 space-y-3.5 lg:space-y-4">
        {LOOP_STEPS.map((step, i) => (
          <li key={step.key} className={cx(styles.step, i === 2 && styles.wake)}>
            {i < 2 ? <span aria-hidden className={cx(styles.rail, i === 1 && styles.wire)} /> : null}
            {/* Decorative: the ordered list carries the sequence. */}
            <span
              aria-hidden
              className={cx(
                styles.num,
                i === 1 && styles.num2,
                "pt-px text-caption font-medium",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium leading-snug text-ink-50">{step.title}</p>

              {i === 0 ? (
                <p
                  className={cx(
                    styles.chip,
                    "mt-2.5 inline-flex max-w-full items-center gap-2 rounded-md px-2 py-1 font-mono text-label-sm text-ink-400",
                  )}
                >
                  <span aria-hidden className={styles.flip}>
                    <span className={styles.held}>held</span>
                    <span className={styles.sent}>sent</span>
                  </span>
                  <span className="sr-only">{approved ? "sent" : "held"}: </span>
                  <span aria-hidden className="text-ink-600">
                    ·
                  </span>
                  <span className="truncate">reply to a new inquiry</span>
                </p>
              ) : null}

              {i === 1 ? (
                <>
                  {/* Fixed-height slot: both controls live on one line of a
                      box whose height never changes, so the click only swaps
                      things horizontally inside it. 44px for touch at every
                      width (an iPad at 1024 is still a finger); the compact
                      36px size is for a mouse or trackpad only. */}
                  <div className="mt-3 flex h-11 items-center gap-2 pointer-fine:h-9">
                    <button
                      ref={approveRef}
                      type="button"
                      onClick={() => {
                        if (!approved) onApprove();
                      }}
                      // aria-disabled, not disabled: `disabled` would drop
                      // focus off the control the visitor just pressed.
                      aria-disabled={approved || undefined}
                      className={cx(
                        styles.approve,
                        "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg px-4 text-[0.875rem] font-medium pointer-fine:h-9 pointer-fine:px-3.5",
                      )}
                    >
                      <span className={styles.labels}>
                        {/* Both labels stay in the DOM so the button never changes
                            width; only the one showing is exposed. */}
                        <span aria-hidden={approved || undefined} className={styles.idle}>
                          Approve the draft
                        </span>
                        <span aria-hidden={!approved || undefined} className={styles.done}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path
                              d="M3 8.5l3.2 3L13 4.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Approved
                        </span>
                      </span>
                    </button>

                    {approved ? (
                      <button
                        type="button"
                        // This button unmounts on reset, so focus goes back
                        // to the control that starts the loop again.
                        onClick={() => {
                          onReset();
                          approveRef.current?.focus();
                        }}
                        className="h-11 whitespace-nowrap px-2 text-caption text-ink-400 transition-colors hover:text-ink-100 pointer-fine:h-9"
                      >
                        Run it again
                        <span className="sr-only"> from the draft</span>
                      </button>
                    ) : null}
                  </div>

                  {/* The outcome, in the same words the step uses. Empty and
                      present on the server, so the region exists before it
                      fills. */}
                  <p className="sr-only" aria-live="polite">
                    {approved ? "Draft approved. The rules get sharper, and the next draft follows them." : ""}
                  </p>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 border-t border-line-soft pt-3.5 text-caption text-ink-500 lg:mt-4 lg:pt-3">
        Illustrative sample data, not a live system.
      </p>
    </div>
  );
}
