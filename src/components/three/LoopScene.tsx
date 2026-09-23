"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/cn";
import { LoopFallback } from "./LoopFallback";
import { QUEUE_START } from "./loopShape";
import type { LoopSceneController } from "./loopSceneCore";

/** Window event that approves the lead held draft: `window.dispatchEvent(new CustomEvent(APPROVE_EVENT))`. */
export const APPROVE_EVENT = "gravixar:approve";

export interface LoopSceneHandle {
  /** Release the lead held draft through the gate. Flashes the gate even when nothing is waiting. */
  approve: () => void;
  /** Alias of approve(). */
  pulse: () => void;
  /** Same as the `progress` prop, without a React render (for scroll handlers). */
  setProgress: (p: number) => void;
}

export interface LoopSceneProps {
  /** 0..1, drives a gentle camera dolly only. */
  progress?: number;
  /** Clicking the gate approves. Default true. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Fires after each draft actually approved, with the running total. */
  onApprove?: (count: number) => void;
  /** Fires when the number of drafts held at the gate changes. */
  onQueueChange?: (held: number) => void;
  ref?: Ref<LoopSceneHandle>;
}

const FADE = "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * "The approval loop": drafts travel a loop and queue at a gate until a human
 * approves them. Renders a static SVG first; three.js loads after the page's
 * load event and an idle callback, then cross-fades in.
 */
export function LoopScene({
  progress = 0,
  interactive = true,
  className,
  style,
  onApprove,
  onQueueChange,
  ref,
}: LoopSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<LoopSceneController | null>(null);
  const liveRef = useRef(false);
  const progressRef = useRef(progress);
  const interactiveRef = useRef(interactive);
  const visibleRef = useRef(true);
  const countRef = useRef(0);
  const litTimer = useRef(0);
  const callbacks = useRef({ onApprove, onQueueChange });
  const [live, setLive] = useState(false);
  const [fallbackLit, setFallbackLit] = useState(false);

  useEffect(() => {
    callbacks.current = { onApprove, onQueueChange };
  });

  const approve = useCallback(() => {
    const ctl = ctlRef.current;
    let approved = true;
    if (ctl && liveRef.current) {
      approved = ctl.approve();
    } else {
      // Static drawing: light its gate briefly.
      setFallbackLit(true);
      window.clearTimeout(litTimer.current);
      litTimer.current = window.setTimeout(() => setFallbackLit(false), 900);
    }
    if (approved) {
      countRef.current += 1;
      callbacks.current.onApprove?.(countRef.current);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      approve,
      pulse: approve,
      setProgress: (p: number) => {
        progressRef.current = p;
        ctlRef.current?.setProgress(p);
      },
    }),
    [approve],
  );

  useEffect(() => {
    progressRef.current = progress;
    ctlRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    interactiveRef.current = interactive;
    ctlRef.current?.setInteractive(interactive);
  }, [interactive]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let idleId = 0;
    let timeoutId = 0;
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    callbacks.current.onQueueChange?.(QUEUE_START);

    const boot = () => {
      import("./loopSceneCore")
        .then(({ createLoopScene }) => {
          if (disposed) return;
          const ctl = createLoopScene(host, {
            reducedMotion: reduceMq.matches,
            mobile: window.matchMedia("(max-width: 767px)").matches,
            progress: progressRef.current,
            visible: visibleRef.current,
            interactive: interactiveRef.current,
            onReady: () => {
              if (disposed) return;
              liveRef.current = true;
              setLive(true);
            },
            onLost: () => {
              liveRef.current = false;
              if (!disposed) setLive(false);
            },
            onRequestApprove: approve,
            onQueueChange: (held) => callbacks.current.onQueueChange?.(held),
          });
          ctlRef.current = ctl;
        })
        .catch(() => {
          // Chunk failed to load: the static drawing stays.
        });
    };
    const schedule = () => {
      if (disposed) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(boot, { timeout: 2000 });
      } else {
        timeoutId = window.setTimeout(boot, 200);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    const onReduce = () => ctlRef.current?.setReducedMotion(reduceMq.matches);
    reduceMq.addEventListener("change", onReduce);
    window.addEventListener(APPROVE_EVENT, approve);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        visibleRef.current = entry ? entry.isIntersecting : true;
        ctlRef.current?.setVisible(visibleRef.current);
      },
      { rootMargin: "64px" },
    );
    io.observe(host);

    return () => {
      disposed = true;
      window.removeEventListener("load", schedule);
      if (idleId && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      window.clearTimeout(timeoutId);
      window.clearTimeout(litTimer.current);
      reduceMq.removeEventListener("change", onReduce);
      window.removeEventListener(APPROVE_EVENT, approve);
      io.disconnect();
      ctlRef.current?.dispose();
      ctlRef.current = null;
      liveRef.current = false;
    };
  }, [approve]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)} style={style} aria-hidden="true">
      <LoopFallback
        lit={fallbackLit}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: live ? 0 : 1, transition: FADE }}
      />
      <div ref={hostRef} className="absolute inset-0" style={{ opacity: live ? 1 : 0, transition: FADE }} />
    </div>
  );
}
