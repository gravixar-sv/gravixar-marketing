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

/**
 * Whether WebGL here runs on a graphics card. `failIfMajorPerformanceCaveat`
 * is the standard way to ask: the browser refuses the context when it would
 * fall back to software rendering (SwiftShader, llvmpipe, Microsoft Basic
 * Render). Found 2026-10-10: PageSpeed's desktop test has no GPU, and the same
 * build scored 97 and 73 two hours apart depending on whether the scene's
 * frames landed as long tasks. Real visitors on such machines got the same
 * stutter. The probe context is released straight away.
 */
function hardwareWebGL(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const toScene = (items: LoopItem[]): SceneItem[] =>
  items.map(({ id, category, priority, version }) => ({ id, category, priority, version }));

/**
 * "The approval loop": tasks wait on a ring for a person to say yes at the
 * gate. The queue itself is owned by the caller (HeroStage); this draws it.
 * Renders a static SVG first; three.js loads after the page's load event and
 * an idle callback (on a phone, after the first touch or 6 seconds), and only
 * where WebGL runs on a graphics card (hardwareWebGL), then cross-fades in, and only then does the DOM layer
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
      // No graphics card behind WebGL (a VM, a blocklisted driver, a headless
      // test browser): the browser would draw every frame on the CPU, and the
      // scene turns into a train of 50-150ms tasks that make the page stutter.
      // Stay on the static drawing, and skip downloading three.js at all.
      if (!hardwareWebGL()) return;
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
    const idle = () => {
      if (disposed) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(boot, { timeout: 2000 });
      } else {
        timeoutId = window.setTimeout(boot, 200);
      }
    };
    // On a phone the scene waits for the visitor's first touch, scroll or
    // key, or 6 seconds, whichever is first. Its chunk evaluates in one task
    // of about 280ms on a mid-range phone, the longest on the page, and booting
    // straight after load put that task in the middle of the page settling.
    // The static drawing is already there and the 3D cross-fades over it, so
    // the wait shows nothing missing. Desktop boots as before. 2026-10-10, HQ
    // brain task marketing-mobile-lcp-fixes.
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const WAKE = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
    let waitId = 0;
    const wake = () => {
      for (const e of WAKE) window.removeEventListener(e, wake);
      window.clearTimeout(waitId);
      idle();
    };
    const schedule = () => {
      if (disposed) return;
      if (!phone) return idle();
      for (const e of WAKE) window.addEventListener(e, wake, { once: true, passive: true });
      waitId = window.setTimeout(wake, 6000);
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
      for (const e of WAKE) window.removeEventListener(e, wake);
      window.clearTimeout(waitId);
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
