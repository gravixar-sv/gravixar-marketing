"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoopScene, type LoopSceneHandle } from "@/components/three/LoopScene";
import { QUEUE_START } from "@/components/three/loopShape";
import { ApprovalStrip } from "../ApprovalStrip";
import styles from "./HeroStage.module.css";

// The right half of the fold: the 3D approval loop, and the approval card
// breaking out of its lower-left edge. No box and no frame: the scene is
// transparent and dissolves into the ink under the hero's ember light.
//
// Wired both ways, so the page shows one mechanism rather than two widgets:
//   - Approve in the card releases the lead held draft at the scene's gate
//     (the handle's approve(), which also lights the static drawing's gate
//     before three.js has loaded);
//   - approving at the gate in the scene flips the card;
//   - the card's "3 drafts waiting" is the scene's own queue, until someone
//     approves; then the card shows the result ("1 sent") until they run it
//     again, because the scene keeps delivering drafts and a climbing count
//     under "Approved" read as the click having done nothing.
//
// The scene lazy-loads three.js after load + idle and server-renders a static
// SVG, so this stage costs the fold nothing if scripting never runs; the card
// is server-rendered complete for the same reason.
//
// Scroll gives the camera a gentle dolly as the fold leaves (causal motion:
// it moves because the reader scrolled). Skipped under reduced motion, where
// the scene renders one still frame anyway.
export function HeroStage() {
  const sceneRef = useRef<LoopSceneHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [approved, setApproved] = useState(false);
  const [held, setHeld] = useState<number>(QUEUE_START);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  const approve = useCallback(() => {
    setApproved(true);
    sceneRef.current?.approve();
  }, []);
  const onSceneApprove = useCallback(() => setApproved(true), []);
  const reset = useCallback(() => setApproved(false), []);

  return (
    // Desktop: a diagonal. The scene rides high (its box starts 48px above the
    // stage) and borrows the column gutter on the left and the page padding on
    // the right (transparent canvas, clipped by its own box, so no overflow),
    // so the loop sits big beside the headline. The card hangs off the
    // stage's lower-left corner, 40px out to the left and 40px below.
    //
    // What renders (measured 2026-09-23 at 1024, 1280 and 1440): the loop's
    // lowest drawn point sits about 85 to 90px above the card's top edge, so
    // no draft ever passes under the panel. The card overlaps only the last
    // few pixels of the scene's BOX, inside its dissolve, where nothing is
    // drawn. The gate, on the loop's right, is never covered. That clearance
    // depends on the card staying short (titles and controls only, no step
    // bodies): a taller card grows upward from its bottom anchor and would
    // cut across the near arc again.
    //
    // Phones: the scene, then the card tucked into its dissolve.
    <div className="relative lg:mt-2 lg:h-[39rem]">
      <div
        ref={stageRef}
        className={`${styles.stage} hero-enter relative h-[16rem] [animation-delay:180ms] sm:h-[22rem] lg:absolute lg:-left-24 lg:-right-6 lg:-top-12 lg:h-[26rem]`}
      >
        <LoopScene
          ref={sceneRef}
          className="absolute inset-0"
          onApprove={onSceneApprove}
          onQueueChange={setHeld}
        />
      </div>

      <div className="relative z-10 -mt-8 sm:mx-auto sm:max-w-[23rem] lg:absolute lg:-bottom-10 lg:-left-10 lg:mx-0 lg:mt-0 lg:w-[21.25rem] lg:max-w-none">
        <ApprovalStrip
          className="hero-enter [animation-delay:340ms]"
          approved={approved}
          held={held}
          onApprove={approve}
          onReset={reset}
        />
      </div>
    </div>
  );
}
