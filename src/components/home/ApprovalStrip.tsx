"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PriorityBars } from "@/components/three/LoopOverlay";
import { PRIORITIES, draftSegments, optionLabel, taskDef, type DraftSegment } from "./hero/approvalTasks";
import { learningLine, summaryLine, type QueueState } from "./hero/approvalQueue";
import { CATEGORIES } from "./hero/taskPalette";
import styles from "./ApprovalStrip.module.css";

// The approval panel on the homepage fold: the task waiting at the 3D loop's
// gate, in four steps, and the decision a person makes about it. It is the
// thesis ("asks before it acts") as something you can do. HeroStage owns the
// queue (hero/approvalQueue.ts); this panel and the scene both read it, so
// they can never disagree about what is waiting.
//
//   01 The task         name, category, priority
//   02 The AI drafts    the draft types out; a rewrite marks what changed
//   03 A person decides Approve, or Send back for revision (three options
//                       for that task, each editing one named part)
//   04 It goes out      nothing, until someone says yes; then where it went
//
// BASE VISIBILITY. The server renders the first task complete: its draft is
// already written, nothing is typed on load. Typing only ever happens for a
// draft that arrives after the visitor has acted, and the untyped letters are
// in the DOM at opacity 0, so the text is always whole for a screen reader
// and the box never changes height mid-sentence.
//
// No em dashes, first person, plain words: the drafts are written in
// hero/approvalTasks.ts, and every label here is a word an owner would say.

type Props = {
  state: QueueState;
  reduced: boolean;
  onApprove: () => void;
  onRevise: () => void;
  onCancel: () => void;
  onChoose: (option: string) => void;
  onRefill: () => void;
  className?: string;
};

// A plain joiner, not cn(): keeps the custom size utilities next to colours.
const cx = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(" ");

/** Letters per second. A two-line draft lands in about a second. */
const CPS = 110;

function useTypewriter(total: number, from: number, key: string, animate: boolean): number {
  const [run, setRun] = useState({ key, count: total });
  let count = run.count;
  if (run.key !== key) {
    // A new draft: start where it starts in this same render, so the whole
    // text never flashes up before the typing begins.
    count = animate ? Math.min(from, total) : total;
    setRun({ key, count });
  }
  useEffect(() => {
    const base = Math.min(from, total);
    if (!animate || base >= total) {
      setRun((r) => (r.key === key && r.count === total ? r : { key, count: total }));
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const c = Math.min(total, base + Math.floor(((now - start) / 1000) * CPS));
      setRun((r) => (r.key === key && r.count === c ? r : { key, count: c }));
      if (c < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // A frozen or throttled tab runs no frames: finish on a timer anyway, so a
    // draft can never be left half written.
    const done = window.setTimeout(
      () => setRun({ key, count: total }),
      ((total - base) / CPS) * 1000 + 600,
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [key, animate, total, from]);
  return count;
}

function Typed({ segments, count, typing }: { segments: DraftSegment[]; count: number; typing: boolean }) {
  const out: ReactNode[] = [];
  let offset = 0;
  let caretPlaced = false;
  segments.forEach((seg, i) => {
    const shown = Math.max(0, Math.min(seg.text.length, count - offset));
    const head = seg.text.slice(0, shown);
    const tail = seg.text.slice(shown);
    if (head) {
      out.push(
        seg.changed ? (
          <mark key={`h${i}`} className={styles.mark}>
            {head}
          </mark>
        ) : (
          <span key={`h${i}`}>{head}</span>
        ),
      );
    }
    if (typing && !caretPlaced && tail) {
      out.push(<span key="caret" aria-hidden="true" className={styles.caret} />);
      caretPlaced = true;
    }
    if (tail) {
      out.push(
        <span key={`t${i}`} className={styles.ghost}>
          {tail}
        </span>,
      );
    }
    offset += seg.text.length;
  });
  return <>{out}</>;
}

function Check({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "6 waiting", the figure rolling up out of a clip when it changes. */
function Waiting({ n }: { n: number }) {
  return (
    <p className="font-mono text-label-sm tabular-nums text-ink-400">
      <span className={styles.count}>
        <span key={n} className={styles.countIn}>
          {n}
        </span>
      </span>{" "}
      waiting
    </p>
  );
}

function Step({
  n,
  title,
  aside,
  wire,
  children,
}: {
  n: string;
  title: string;
  /** Metadata that rides the title row on the right (chips, the version),
   *  wrapping under the title when it does not fit. */
  aside?: ReactNode;
  /** The rail below this step, when the step has one. */
  wire?: "plain" | "coral";
  children: ReactNode;
}) {
  return (
    <li className={styles.step}>
      {wire ? <span aria-hidden="true" className={cx(styles.rail, wire === "coral" && styles.wire)} /> : null}
      <span aria-hidden="true" className={cx(styles.num, "pt-px text-caption font-medium")}>
        {n}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-caption text-ink-400">{title}</p>
          {aside}
        </div>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

export function ApprovalStrip({ state, reduced, onApprove, onRevise, onCancel, onChoose, onRefill, className }: Props) {
  const { phase } = state;
  const rootRef = useRef<HTMLDivElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const reviseRef = useRef<HTMLButtonElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const refillRef = useRef<HTMLButtonElement>(null);
  const [armed, setArmed] = useState(false);
  const lastFocus = useRef(state.focus);
  if (state.focus) lastFocus.current = state.focus;

  // Transitions and the idle nudge only once hydrated: the server paints the
  // finished resting state.
  useEffect(() => setArmed(true), []);

  const task = lastFocus.current ? state.tasks[lastFocus.current] : undefined;
  const def = task ? taskDef(task.key) : undefined;
  const segments = def && task ? draftSegments(def, task) : [];
  const total = segments.reduce((n, s) => n + s.text.length, 0);

  // Typing. A task arriving at the gate types from the start; a rewrite types
  // in from where its changed part begins. Nothing types on first load.
  const rewriting = phase === "returned";
  let from = 0;
  if (rewriting) {
    let offset = 0;
    for (const seg of segments) {
      if (seg.changed) {
        from = offset;
        break;
      }
      offset += seg.text.length;
      from = total;
    }
  }
  const key = rewriting ? `r${state.rewrite}` : `s${state.seq}:${lastFocus.current}`;
  const animate = !reduced && (rewriting || state.seq > 0);
  const count = useTypewriter(total, from, key, animate);
  const typing = count < total;

  // The nudge: three seconds after the draft is written, if nobody has
  // decided, Approve starts to pulse, gently, until someone does.
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    setNudge(false);
    if (phase !== "review" || typing || reduced || !armed) return;
    const id = window.setTimeout(() => setNudge(true), 3000);
    return () => window.clearTimeout(id);
  }, [phase, typing, reduced, armed, state.seq]);

  // Keep the keyboard where the visitor is: into the options when they open,
  // back to the button that opened them, onto "Bring in new tasks" when the
  // queue empties under their focus, and back to Approve when tasks return.
  // Only when focus was inside this panel as the change rendered (the control
  // that had it may have just gone inert), and never with a scroll: a refill
  // on its timer must not pull a reader back up from further down the page.
  const prevPhase = useRef(phase);
  const focusedAtRender = useRef<Element | null>(null);
  focusedAtRender.current = typeof document === "undefined" ? null : document.activeElement;
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = phase;
    if (was === phase) return;
    const root = rootRef.current;
    if (!root || !focusedAtRender.current || !root.contains(focusedAtRender.current)) return;
    const go = (el: HTMLElement | null) => el?.focus({ preventScroll: true });
    if (phase === "choosing") go(firstOptionRef.current);
    else if (was === "choosing" && phase === "review") go(reviseRef.current);
    else if (was === "choosing" && phase === "returned") go(approveRef.current);
    else if (phase === "clear") go(refillRef.current);
    else if (was === "clear" && phase === "review") go(approveRef.current);
  }, [phase]);

  const clear = phase === "clear";
  const decided = phase === "sent";
  const held = phase === "sent" || phase === "returned";
  const choosing = phase === "choosing";

  let announce = "";
  if (phase === "sent" && def) announce = `Approved. ${def.done.text}${def.done.target ? ` ${def.done.target}` : ""}.`;
  else if (phase === "returned" && task) announce = `Sent back. Version ${task.version} goes to the back of the queue.`;
  else if (phase === "review" && def && state.seq > 0)
    announce = `At the gate: ${def.name}. ${CATEGORIES[def.category].long}, ${PRIORITIES[def.priority].label.toLowerCase()} priority.`;
  else if (clear) announce = `All clear. ${summaryLine(state.stats)}`;

  const version =
    task && task.version > 1 && task.reason ? (
      <>
        <span className="text-ink-200">V{task.version}</span> · you asked: {task.reason}
      </>
    ) : (
      <>
        <span className="text-ink-200">V1</span> · first draft
      </>
    );

  return (
    <div
      ref={rootRef}
      role="group"
      aria-labelledby="approval-card-title"
      data-armed={armed || undefined}
      data-phase={phase}
      data-nudge={nudge || undefined}
      className={cx(styles.card, "panel-lit rounded-2xl p-5 sm:p-6 lg:p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p id="approval-card-title" className="text-caption font-medium text-ink-200">
          The approval loop
        </p>
        <Waiting n={state.order.length} />
      </div>

      <div className={styles.body}>
        <ol className={styles.steps} inert={clear || undefined} aria-hidden={clear || undefined}>
          {def && task ? (
            <>
              <Step
                n="01"
                title="The task"
                wire="plain"
                aside={
                  <p key={task.id} className={cx(styles.swapIn, "flex flex-wrap items-center gap-1.5")}>
                    <span className={styles.chip}>
                      <span aria-hidden="true" className={styles.dot} style={{ background: CATEGORIES[def.category].hex }} />
                      {CATEGORIES[def.category].label}
                    </span>
                    <span className={styles.chip}>
                      <PriorityBars level={PRIORITIES[def.priority].level} className="text-ink-200" />
                      {PRIORITIES[def.priority].label}
                      <span className="sr-only"> priority</span>
                    </span>
                  </p>
                }
              >
                <p key={task.id} className={cx(styles.swapIn, "text-[0.9375rem] font-medium leading-snug text-ink-50")}>
                  {def.name}
                </p>
              </Step>

              <Step
                n="02"
                title="The AI drafts"
                wire="plain"
                aside={
                  <p key={`${task.id}:${task.version}`} className={cx(styles.version, "font-mono text-label-sm text-ink-400")}>
                    {version}
                  </p>
                }
              >
                <div className={styles.draft}>
                  <p className="text-[0.875rem] leading-[1.45rem] text-ink-200">
                    <Typed segments={segments} count={count} typing={typing} />
                  </p>
                </div>
              </Step>

              <Step n="03" title="A person decides" wire={decided ? "coral" : "plain"}>
                <div className={styles.swap} data-open={choosing || undefined}>
                  <div className={styles.pane} inert={choosing || undefined}>
                    <div className={styles.paneInner}>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          ref={approveRef}
                          type="button"
                          onClick={onApprove}
                          aria-disabled={held || undefined}
                          className={cx(
                            styles.approve,
                            "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg px-4 text-[0.875rem] font-medium pointer-fine:h-9 pointer-fine:px-3.5",
                          )}
                        >
                          <span className={styles.labels}>
                            {/* Both labels stay in the DOM so the button never
                                changes width; only the one showing is exposed. */}
                            <span aria-hidden={decided || undefined} className={styles.idle}>
                              Approve
                            </span>
                            <span aria-hidden={!decided || undefined} className={styles.done}>
                              <Check />
                              Approved
                            </span>
                          </span>
                        </button>
                        <button
                          ref={reviseRef}
                          type="button"
                          onClick={onRevise}
                          aria-disabled={held || undefined}
                          aria-expanded={choosing}
                          className={cx(
                            styles.revise,
                            "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg px-3.5 text-[0.875rem] font-medium pointer-fine:h-9",
                          )}
                        >
                          Send back for revision
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={styles.pane} inert={!choosing || undefined}>
                    <div className={styles.paneInner}>
                      <p className="text-caption text-ink-200">What should change?</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {def.options.map((opt, i) => (
                          <button
                            key={opt.id}
                            ref={i === 0 ? firstOptionRef : undefined}
                            type="button"
                            onClick={() => onChoose(opt.id)}
                            className={cx(
                              styles.option,
                              "inline-flex h-11 items-center rounded-lg px-3 text-[0.8125rem] pointer-fine:h-8",
                            )}
                          >
                            {optionLabel(opt, task)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={onCancel}
                          className="inline-flex h-11 items-center px-2 text-[0.8125rem] text-ink-400 transition-colors hover:text-ink-100 pointer-fine:h-8"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Step>

              <Step n="04" title="It goes out">
                <div className={styles.outcome}>
                  {phase === "sent" ? (
                    <p key={`sent-${task.id}`} className={cx(styles.swapIn, "flex items-baseline gap-2 text-[0.875rem] text-ink-100")}>
                      <Check className="translate-y-[1px] shrink-0 text-brand" />
                      <span className="min-w-0">
                        {def.done.text}
                        {def.done.target ? (
                          <>
                            {" "}
                            <span className="break-all font-mono text-[0.8125rem] text-ink-50">{def.done.target}</span>
                          </>
                        ) : null}
                      </span>
                    </p>
                  ) : phase === "returned" ? (
                    <p key={`back-${task.id}-${task.version}`} className={cx(styles.swapIn, "text-[0.875rem] text-ink-300")}>
                      Nothing went out. V{task.version} goes to the back of the queue.
                    </p>
                  ) : (
                    <p className="text-[0.875rem] text-ink-400">Nothing goes out until someone says yes.</p>
                  )}
                </div>
              </Step>
            </>
          ) : null}
        </ol>

        {clear ? (
          <div className={styles.clear}>
            <p className="flex items-center gap-2 text-[1.0625rem] font-medium text-ink-50">
              <Check className="text-brand" />
              All clear
            </p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-200">{summaryLine(state.stats)}</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-400">{learningLine(state.stats)}</p>
            <button
              ref={refillRef}
              type="button"
              onClick={onRefill}
              className={cx(
                styles.refill,
                "mt-5 inline-flex h-11 items-center rounded-lg px-4 text-[0.875rem] font-medium pointer-fine:h-9",
              )}
            >
              Bring in new tasks
              <span aria-hidden="true" key={state.batch} className={styles.timer} />
            </button>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <p className="mt-5 border-t border-line-soft pt-3.5 text-caption text-ink-500 lg:mt-4 lg:pt-3">
        Illustrative sample data, not a live system.
      </p>
    </div>
  );
}
