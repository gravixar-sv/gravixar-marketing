"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useSyncExternalStore } from "react";
import { LoopScene, type LoopItem, type LoopSceneHandle } from "@/components/three/LoopScene";
import { ApprovalStrip } from "../ApprovalStrip";
import { initialQueue, queueReducer } from "./approvalQueue";
import { PRIORITIES, taskDef } from "./approvalTasks";
import styles from "./HeroStage.module.css";

// The right half of the fold: the 3D approval loop, and the approval panel
// under it. No box and no frame: the scene is transparent and dissolves into
// the ink under the hero's ember light.
//
// ONE QUEUE, TWO VIEWS. This component owns the queue (approvalQueue.ts);
// the scene draws it and the panel runs it, so they cannot disagree:
//   - Approve in the panel, or a click on the gate ring, approves the task
//     at the gate: its card turns coral and leaves through the ring, the rest
//     glide forward, and the panel shows where it went;
//   - Send back for revision rewrites one part of the draft, and the card
//     arcs over the ring to the back of the queue with its new version;
//   - when nothing is left the panel says "All clear", and new tasks drift
//     in after eight seconds, or sooner if asked.
// The outcome of each click holds for a moment (the timers below) before the
// next task takes the gate, so every decision is seen to land.
//
// The scene lazy-loads three.js after load + idle and server-renders a static
// SVG of the same queue, and the panel is server-rendered with the first task
// complete, so this stage costs the fold nothing if scripting never runs.
//
// Scroll gives the camera a gentle dolly as the fold leaves (causal motion:
// it moves because the reader scrolled). Skipped under reduced motion, where
// the scene renders still frames anyway.

/** How long the outcome of a decision stays up before the next task takes the gate. */
const SENT_HOLD = 1600;
const RETURNED_HOLD = 1900;
/** "All clear" lasts this long before new tasks drift in on their own. */
const REFILL_AFTER = 8000;

const reduceQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(reduceQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function HeroStage() {
  const sceneRef = useRef<LoopSceneHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(queueReducer, undefined, initialQueue);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reduceQuery).matches,
    () => false,
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (window.matchMedia(reduceQuery).matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // 0 at the top of the page, 1 once the stage's bottom edge has reached
      // the top of the viewport.
      const travelled = window.scrollY;
      const span = r.bottom + travelled;
      const p = span > 0 ? Math.min(1, Math.max(0, travelled / span)) : 0;
      sceneRef.current?.setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // The holds: each outcome stays up, then the queue moves on.
  useEffect(() => {
    const { phase } = state;
    if (phase !== "sent" && phase !== "returned" && phase !== "clear") return;
    const id = window.setTimeout(
      () => dispatch({ type: phase === "clear" ? "refill" : "advance" }),
      phase === "sent" ? SENT_HOLD : phase === "returned" ? RETURNED_HOLD : REFILL_AFTER,
    );
    return () => window.clearTimeout(id);
  }, [state.phase, state.seq, state.rewrite, state.stats.approved]);

  const items: LoopItem[] = useMemo(
    () =>
      state.order.map((id) => {
        const task = state.tasks[id]!;
        const def = taskDef(task.key);
        return {
          id,
          name: def.name,
          category: def.category,
          priority: PRIORITIES[def.priority].level,
          priorityLabel: PRIORITIES[def.priority].label,
          version: task.version,
          reason: task.reason,
        };
      }),
    [state.order, state.tasks],
  );

  const approve = useCallback(() => dispatch({ type: "approve" }), []);
  const revise = useCallback(() => dispatch({ type: "revise" }), []);
  const cancel = useCallback(() => dispatch({ type: "cancel" }), []);
  const choose = useCallback((option: string) => dispatch({ type: "choose", option }), []);
  const refill = useCallback(() => dispatch({ type: "refill" }), []);

  return (
    // Desktop: a diagonal. The scene rides high: its box starts 144px above
    // the stage, which only lifts empty canvas (the loop is width-bound and
    // sits in the middle of its box), so the ring's top lines up with the
    // headline's. It borrows the column gutter on the left and the page
    // padding on the right (transparent canvas, clipped by its own box). The
    // panel hangs off the stage's left edge, 40px out, and starts in the
    // scene's dissolve just under the loop's lowest card, so it grows down
    // the page with its four steps instead of up into the ring.
    //
    // Measured 2026-09-23 (page y, CSS px): at 1440 x 900 the lowest card
    // ends at 347, the panel runs 370 to 848 and Approve sits at 686, so the
    // whole panel clears the fold; at 1280 x 720 Approve sits at 637. The
    // gate, on the loop's right, is never covered: its label sits under the
    // ring, and the panel never reaches that far right.
    //
    // Phones: the scene, then the panel tucked into its dissolve.
    <div className="relative lg:mt-2">
      <div
        ref={stageRef}
        className={`${styles.stage} hero-enter relative h-[16rem] [animation-delay:180ms] sm:h-[22rem] lg:-mr-6 lg:-ml-24 lg:-mt-36 lg:h-[26rem]`}
      >
        <LoopScene ref={sceneRef} className="absolute inset-0" items={items} onGateClick={approve} />
      </div>

      <div className="relative z-10 -mt-8 sm:mx-auto sm:max-w-[24rem] lg:-ml-10 lg:-mt-[4.75rem] lg:mr-0 lg:w-[24rem] lg:max-w-none">
        <ApprovalStrip
          className="hero-enter [animation-delay:340ms]"
          state={state}
          reduced={reduced}
          onApprove={approve}
          onRevise={revise}
          onCancel={cancel}
          onChoose={choose}
          onRefill={refill}
        />
      </div>
    </div>
  );
}
