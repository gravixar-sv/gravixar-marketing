"use client";

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { cn } from "@/lib/cn";
import { LoopFallback } from "./LoopFallback";
import { LoopOverlay, type LoopItem, type LoopOverlayHandle } from "./LoopOverlay";
import type { LoopSceneController, SceneItem, SceneSnapshot } from "./loopSceneCore";

export type { LoopItem } from "./LoopOverlay";

export interface LoopSceneHandle {
  /** Same as the `progress` prop, without a React render (for scroll handlers). */
  setProgress: (p: number) => void;
}

export interface LoopSceneProps {
  /** The queue, front first. The first item is the task waiting at the gate. */
  items: LoopItem[];
  /** 0..1, drives a gentle camera dolly only. */
  progress?: number;
  /** Clicking the gate asks for an approval. Default true. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  /** The visitor clicked the gate ring itself. */
  onGateClick?: () => void;
  ref?: Ref<LoopSceneHandle>;
}

const FADE = "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)";

const toScene = (items: LoopItem[]): SceneItem[] =>
  items.map(({ id, category, priority, version }) => ({ id, category, priority, version }));

/**
 * "The approval loop": tasks wait on a ring for a person to say yes at the
 * gate. The queue itself is owned by the caller (HeroStage); this draws it.
 * Renders a static SVG first; three.js loads after the page's load event and
 * an idle callback, then cross-fades in, and only then does the DOM layer
 * (hover, tap and keyboard on each card) appear, because until then there is
 * no live card for it to sit on.
 */
export function LoopScene({ items, progress = 0, interactive = true, className, style, onGateClick, ref }: LoopSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<LoopSceneController | null>(null);
  const overlayRef = useRef<LoopOverlayHandle>(null);
  const snapRef = useRef<SceneSnapshot | null>(null);
  const progressRef = useRef(progress);
  const interactiveRef = useRef(interactive);
  const visibleRef = useRef(true);
  const itemsRef = useRef(items);
  const gateRef = useRef(onGateClick);
  const prevCount = useRef(items.length);
  const litTimer = useRef(0);
  const [live, setLive] = useState(false);
  const [lit, setLit] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    gateRef.current = onGateClick;
  });

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (p: number) => {
        progressRef.current = p;
        ctlRef.current?.setProgress(p);
      },
    }),
    [],
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
    itemsRef.current = items;
    ctlRef.current?.setItems(toScene(items));
    // The static drawing has no motion to show an approval with, so its gate
    // lights for a moment instead (no WebGL, or before three.js has loaded).
    if (items.length < prevCount.current && !ctlRef.current) {
      setLit(true);
      window.clearTimeout(litTimer.current);
      litTimer.current = window.setTimeout(() => setLit(false), 900);
    }
    prevCount.current = items.length;
  }, [items]);

  useEffect(() => {
    ctlRef.current?.setHighlight(highlight);
  }, [highlight]);

  // The overlay mounts with `live`; give it the last frame straight away, since
  // a still scene (reduced motion) may not render another for a while.
  useEffect(() => {
    if (live && snapRef.current) overlayRef.current?.update(snapRef.current);
  }, [live]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let idleId = 0;
    let timeoutId = 0;
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

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
            items: toScene(itemsRef.current),
            onReady: () => {
              if (disposed) return;
              setLive(true);
            },
            onLost: () => {
              if (!disposed) setLive(false);
            },
            onGateClick: () => gateRef.current?.(),
            onFrame: (snap) => {
              snapRef.current = snap;
              overlayRef.current?.update(snap);
            },
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
      io.disconnect();
      ctlRef.current?.dispose();
      ctlRef.current = null;
    };
  }, []);

  return (
    <div className={cn("relative isolate", className)} style={style}>
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <LoopFallback
          categories={items.map((i) => i.category)}
          lit={lit}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: live ? 0 : 1, transition: FADE }}
        />
        <div ref={hostRef} className="absolute inset-0" style={{ opacity: live ? 1 : 0, transition: FADE }} />
      </div>
      {live ? <LoopOverlay ref={overlayRef} items={items} onHighlight={setHighlight} /> : null}
    </div>
  );
}
