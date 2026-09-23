"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

// The lead media on a /graphics detail page when the piece IS motion. The file
// has no audio track, so native controls (a scrubber, a volume slider, a
// fullscreen kebab) were chrome over the one frame the page exists to show.
// One play/pause button instead.
//
// PRESS TO PLAY, for everyone. Nothing on this site moves on its own except the
// client logo rail (the /graphics card preview plays once when the reader
// scrolls it into view, never on a loop), and the page's own copy says the
// player at the top waits until you press play and that a clip playing itself
// cannot stand in for the scroll-driven original. An autoplaying hero made
// both of those untrue.
//
//   - The server renders a <video> carrying only its poster, so with no JS the
//     still is correct and a <noscript> link opens the file.
//   - The src is attached only when the reader presses play, so nobody fetches
//     the clip without asking for it, reduced motion or not.
//   - It plays through once. After a press it pauses when less than a third of
//     it is on screen and resumes when the reader scrolls back, and pausing is
//     always the reader's call. When it ends, the choice resets, so scrolling
//     past again never restarts it.
export function CinematicVideo({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);
  // "play" only after a press; visibility can pause a pressed clip but can
  // never start one.
  const userChoice = useRef<"play" | null>(null);
  const inViewRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = (entry?.intersectionRatio ?? 0) >= 0.35;
        if (userChoice.current !== "play") return;
        if (inViewRef.current) {
          if (el.src && el.paused) void el.play().catch(() => {});
        } else if (!el.paused) {
          el.pause();
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The render that attaches the src lands here; start the playback the press
  // asked for.
  useEffect(() => {
    const el = ref.current;
    if (armed && el && userChoice.current === "play") void el.play().catch(() => {});
  }, [armed]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      userChoice.current = null;
      el.pause();
    } else {
      userChoice.current = "play";
      if (!armed) setArmed(true);
      else void el.play().catch(() => {});
    }
  }

  const action = playing ? "Pause the showreel" : "Play the showreel";

  return (
    <div className={cn("relative", className)}>
      <video
        ref={ref}
        src={armed ? src : undefined}
        poster={poster}
        preload="none"
        muted
        playsInline
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          userChoice.current = null;
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <noscript>
        <a
          href={src}
          className="absolute bottom-4 left-4 rounded-lg bg-ink-950/80 px-3 py-2 text-caption text-ink-100 ring-1 ring-line"
        >
          Open the showreel (MP4)
        </a>
      </noscript>
      {mounted ? (
        // Icon only on a phone (44px circle); the words join it from md up,
        // where there is room to say what the button does.
        <button
          type="button"
          onClick={toggle}
          aria-label={action}
          className="absolute bottom-4 left-4 inline-flex size-11 items-center justify-center gap-2.5 rounded-full bg-ink-950/75 text-ink-100 ring-1 ring-line-strong transition-[background-color,scale] duration-200 hover:bg-ink-900 active:scale-[0.96] active:duration-100 md:bottom-5 md:left-5 md:w-auto md:pl-4 md:pr-5"
        >
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
          <span aria-hidden className="hidden text-caption font-medium md:inline">
            {action}
          </span>
        </button>
      ) : null}
    </div>
  );
}
