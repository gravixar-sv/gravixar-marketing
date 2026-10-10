"use client";

// Bosun's closed state: the launcher pill. Its own file so the page can ship
// it without the panel. BosunMount renders it until the first open, and Bosun
// renders the same button whenever the panel is closed, so it never changes
// shape.
//
// Below md the launcher is a small "Ask" pill that fades in only after the
// fold has scrolled away (.bosun-launcher in globals.css): the old full-width
// pill sat on top of the hero's primary button. No coral dot: Bosun is the
// machine, and coral marks a human decision. Solid, not frosted: glass is not
// part of this system.

export function BosunLauncher({
  onOpen,
  onIntent,
  busy = false,
}: {
  onOpen: () => void;
  /** Hover, focus or touch: a hint the panel is about to be wanted. */
  onIntent?: () => void;
  /** The panel's code is loading after a click. */
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
      aria-label="Ask Bosun"
      aria-busy={busy || undefined}
      className="bosun-launcher fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-ink-900 px-4 text-[0.8125rem] font-medium text-ink-100 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.8)] transition-[border-color,background-color,scale] duration-200 ease-spring hover:border-ink-400/60 hover:bg-ink-800 active:scale-[0.96] md:bottom-6 md:right-6 md:h-10"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-ink-300" />
      <span aria-hidden className="md:hidden">Ask</span>
      <span aria-hidden className="hidden md:inline">Ask Bosun</span>
    </button>
  );
}
