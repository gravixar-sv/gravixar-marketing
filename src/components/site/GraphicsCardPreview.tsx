"use client";

import { useEffect, useRef, useState } from "react";

// The moving cover on a /graphics index card. Only entries that declare a
// `preview` in frontmatter get one, and today that is the scroll cinematic,
// where the motion IS the work: a still frame of it is a photograph of a room,
// which is the one thing the piece is not about.
//
// It is an enhancement over the poster, never a replacement for it. The server
// renders a <video> carrying nothing but its poster attribute, so with no JS,
// no observer and no network past that one image the card is still a correct
// still cover. Everything below only decides whether to upgrade it.
//
// Two guards, and they are separate on purpose:
//   preload="none"  tells the browser not to fetch the mp4 for a video that
//                   has a src. It is a hint, and Safari has historically read
//                   it as "metadata".
//   the `armed` gate never puts the src in the DOM at all until a play
//                   decision has been made, so the reduced-motion path cannot
//                   fetch the file even on a browser that ignores the hint.
// The second one is what makes the promise keepable rather than likely. The
// entry's own copy says the reduced-motion branch never fetches the clips, so
// a card that quietly pulled 250kB anyway would make the page lie about
// itself.
export function GraphicsCardPreview({
  src,
  poster,
  label,
  className = "",
}: {
  src: string;
  poster: string;
  /** Accessible name, carried over from the cover alt the Image used to hold. */
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // Should it be playing right now: on screen, and motion not refused.
  const [active, setActive] = useState(false);
  // Has the src ever been attached. One-way, because unloading a decoded clip
  // to fetch it again on the next scroll past would cost more than it saves.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    // Read the query at decision time, not once at mount: a reader who flips
    // the OS setting mid-visit gets the change applied to a card that is
    // already playing, rather than on the next page load.
    const sync = () => setActive(inView && !motion.matches);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        sync();
      },
      // A third of the card is enough to call it seen, and it means the clip
      // is not started by a fast scroll that flicks the card past the edge.
      { threshold: 0.35 },
    );
    io.observe(el);
    motion.addEventListener("change", sync);
    return () => {
      io.disconnect();
      motion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      el.pause();
      return;
    }
    // First pass through: attach the src and come straight back here on the
    // render it causes, because play() on an element with no source does
    // nothing useful.
    if (!armed) {
      setArmed(true);
      return;
    }
    // Muted and inline, so no autoplay policy should reject this. Swallow it
    // if one does: the poster is still underneath, and a card that throws in
    // the console because a browser declined to play a decoration is worse
    // than a card that stays still.
    void el.play().catch(() => {});
  }, [active, armed]);

  return (
    <video
      ref={ref}
      // Attached only once a play decision exists. See the note above.
      src={armed ? src : undefined}
      poster={poster}
      // next/image cannot touch a poster attribute, so this is the raw webp.
      // It is the same file the cover already ships, so it is one request and
      // it is warm by the time a second card needs it.
      preload="none"
      muted
      loop
      playsInline
      aria-label={label}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
