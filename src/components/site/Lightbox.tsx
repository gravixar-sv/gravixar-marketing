"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";

// Gallery lightbox for /graphics/[slug], built on the NATIVE <dialog> element.
// showModal() is what makes this ~150 lines instead of a dependency: the focus
// trap, Escape-to-close, the inert background and the ::backdrop are all UA
// behaviour, and none of them are things worth reimplementing by hand.
//
// PROGRESSIVE ENHANCEMENT, and this is the part that decides the shape of the
// file: the grid is NOT rendered here. The page renders it on the server, as a
// grid of real <a href="/graphics/.../frame.webp"> cells, and passes it through
// as children. This component only wires listeners onto DOM it did not create.
// So with scripting off, or before hydration, or if hydration never happens, the
// reader still sees every frame in the grid AND can still open the full file,
// because the cell is a link to the file rather than a button waiting for JS.
// The dialog is strictly the better version of that link, never the only one.
//
// Patterns lifted wholesale from Navbar.tsx's More dropdown: controlled open
// state, auto-close on pathname change, aria-haspopup on the trigger.

// The `sizes` a gallery cell renders with. Exported because the dialog's base
// image layer MUST pass the identical string, and the invariant belongs next to
// the code that depends on it rather than in a prop two call sites could drift.
// Same `sizes` -> the browser resolves the same srcset candidate -> the same URL
// -> the frame the reader just clicked is already in the cache and paints on the
// first frame the dialog exists. Widen this and the dialog opens empty while a
// file it has never fetched arrives over the network.
export const GALLERY_SIZES = "(min-width: 768px) 50vw, 100vw";

export type LightboxFrame = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  // Fit inside the cell rather than filling it (fitsInsideCell in
  // GraphicsMeta.tsx), and: does the art need a light backing to be visible at
  // all. Both are resolved by the page so the grid and the dialog cannot
  // disagree about how a frame is presented, and so the "-dark means light
  // backing" heuristic stays in exactly one place.
  fit: boolean;
  onLight: boolean;
};

const CONTROL =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-zinc-300 transition-colors hover:border-brand hover:text-brand-soft";

export function Lightbox({
  title,
  frames,
  children,
}: {
  title: string;
  frames: LightboxFrame[];
  children: ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Mirror of `index` the click listener can read. The listener is registered
  // once, so it closes over the first render's state and cannot read the live
  // value any other way.
  const indexRef = useRef<number | null>(null);
  const pathname = usePathname();

  const count = frames.length;

  // Everything hydration adds to the server's grid, in one place: the cells
  // start intercepting their own navigation, and they say so. Written as plain
  // DOM against children this component does not own, which is the honest shape
  // for an enhancement — the server HTML keeps promising exactly what it
  // delivers without JS (a link to the image file), and the promise is upgraded
  // only once there is something to upgrade it to.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cells = Array.from(
      root.querySelectorAll<HTMLAnchorElement>("a[data-lightbox-index]"),
    );
    for (const cell of cells) cell.setAttribute("aria-haspopup", "dialog");

    function onClick(e: MouseEvent) {
      // Every intent that is not a plain primary click is left alone.
      // Cmd/Ctrl/Shift-click opens the raw file in a tab or window, and that
      // affordance is most of the reason the cell is a real link rather than a
      // div: intercepting it would take away the one thing the anchor bought.
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const cell = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "a[data-lightbox-index]",
      );
      if (!cell) return;
      const i = Number(cell.dataset.lightboxIndex);
      if (!Number.isInteger(i) || i < 0 || i >= count) return;
      e.preventDefault();
      openerRef.current = cell;
      // The ELEMENT is the source of truth for whether the dialog is showing,
      // not this component's state. Reopening the frame the reader just closed
      // is the case that proves it: `index` is already i, so the effect below
      // has no change to react to, and a component that trusted its own state
      // would silently do nothing on that second click. Content for i is still
      // mounted from the previous open (a closed dialog is display:none, not
      // unmounted), so showing it here cannot flash an empty panel.
      const dialog = dialogRef.current;
      if (dialog && !dialog.open && indexRef.current === i) dialog.showModal();
      setIndex(i);
    }

    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      for (const cell of cells) cell.removeAttribute("aria-haspopup");
    };
  }, [count]);

  // Open state is React's; the top layer is the browser's. This is the effect
  // that reconciles them, in both directions, so nothing else in the component
  // has to know showModal() exists.
  useEffect(() => {
    indexRef.current = index;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index === null) {
      if (dialog.open) dialog.close();
    } else if (!dialog.open) {
      dialog.showModal();
    }
  }, [index]);

  // Same reason Navbar closes its dropdown on pathname change: a client-side nav
  // can reuse this component instance (slug to slug on the same route), and a
  // dialog left open in the top layer would then be showing the previous piece's
  // frames over the new page.
  useEffect(() => setIndex(null), [pathname]);

  const frame = index === null ? null : (frames[index] ?? null);
  // Falls back to the grid's 4:3 because width/height are optional in
  // frontmatter. The dialog is sized FROM this ratio rather than being a fixed
  // box the image is letterboxed into, so a 4:1 wordmark and a 16:9 still both
  // fill their panel edge to edge instead of sitting in bars of dead surface.
  const ratio = frame?.width && frame?.height ? frame.width / frame.height : 4 / 3;

  function onDialogClose() {
    setIndex(null);
    // The UA restores focus to the opener on close. This is the belt for engines
    // that do not, and a no-op on the ones that do.
    const opener = openerRef.current;
    if (opener && document.activeElement !== opener) opener.focus();
  }

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    // A click on ::backdrop hit-tests to the dialog element itself, and the
    // panel inside fills the dialog edge to edge, so the dialog can only ever be
    // the target when the reader clicked outside the frame.
    if (e.target === dialogRef.current) setIndex(null);
  }

  function onDialogKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    // Escape is the UA's. Left/right are the only keys this adds, and they wrap,
    // so walking a gallery never dead-ends on the last frame.
    if (index === null || count < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setIndex((i) => ((i ?? 0) + 1) % count);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setIndex((i) => ((i ?? 0) + count - 1) % count);
    }
  }

  return (
    <>
      <div ref={rootRef}>{children}</div>

      {/* m-auto is load-bearing: Tailwind's preflight zeroes the UA's
          `margin: auto` on dialog, and without it a modal dialog pins itself to
          the top-left corner of the viewport rather than centring.
          .live-panel rather than a new surface, and nothing inside it carries a
          second one — the frame below is a background fill, not a card. */}
      <dialog
        ref={dialogRef}
        onClose={onDialogClose}
        onClick={onDialogClick}
        onKeyDown={onDialogKeyDown}
        aria-label={
          frame ? `${title}, frame ${(index ?? 0) + 1} of ${count}` : title
        }
        style={{ width: `min(92vw, ${(72 * ratio).toFixed(2)}vh, 68rem)` }}
        className="live-panel m-auto min-w-[16rem] max-h-none max-w-none rounded-xl p-0 text-fg backdrop:bg-[#0a0a0a]/90"
      >
        {frame ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-line-soft px-4 py-3">
              <p className="font-mono text-label-sm uppercase text-zinc-400">
                frame {(index ?? 0) + 1} / {count}
              </p>
              <div className="flex items-center gap-1.5">
                {count > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => ((i ?? 0) + count - 1) % count)}
                      aria-label="Previous frame"
                      className={CONTROL}
                    >
                      <CaretLeft size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => ((i ?? 0) + 1) % count)}
                      aria-label="Next frame"
                      className={CONTROL}
                    >
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIndex(null)}
                  aria-label="Close"
                  className={CONTROL}
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>

            {/* Two layers of the same source, and the order matters. The base is
                the exact candidate the grid already fetched, so the dialog is
                never an empty box; the upgrade sits on top at dialog width and
                simply starts painting when it arrives. No fade, no onLoad gate,
                no state: an unloaded <img> paints nothing and the base shows
                through it, which is the whole cross-fade for free and needs no
                entry in the reduced-motion whitelist.
                The base carries the alt, so the description survives whether or
                not the larger file ever lands; the upgrade is decorative.
                loading="eager" on the base is not decoration. next/image
                defaults to lazy, and a lazy base is a base that has not decided
                on a source yet at the instant the dialog opens, which is exactly
                the empty box the two layers exist to prevent. Measured in the
                browser: without it the element sits at currentSrc "" while the
                upgrade fetches. */}
            <div
              className={`relative w-full ${frame.onLight ? "bg-zinc-200" : "bg-zinc-950"}`}
              style={{ aspectRatio: `${ratio}` }}
            >
              <Image
                key={`${frame.src}-base`}
                src={frame.src}
                alt={frame.alt}
                fill
                loading="eager"
                sizes={GALLERY_SIZES}
                className={frame.fit ? "object-contain p-6 md:p-10" : "object-contain"}
              />
              <Image
                key={`${frame.src}-full`}
                src={frame.src}
                alt=""
                aria-hidden
                priority
                fill
                sizes="(min-width: 74rem) 68rem, 92vw"
                className={frame.fit ? "object-contain p-6 md:p-10" : "object-contain"}
              />
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
