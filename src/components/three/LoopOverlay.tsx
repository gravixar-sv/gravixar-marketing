"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { CATEGORIES, type CategoryKey } from "../home/hero/taskPalette";
import type { SceneSnapshot } from "./loopSceneCore";
import styles from "./LoopOverlay.module.css";

// The DOM layer over the 3D queue. The canvas is a picture; this layer is what
// a hand, a mouse, a keyboard and a screen reader actually touch.
//
//   - One transparent button per queued card, moved onto the card's screen
//     box on every rendered frame (the scene reports the boxes; nothing here
//     re-renders per frame). Focus shows the site's coral ring around the card.
//   - One tab stop for the whole queue: arrow keys walk the cards (a roving
//     tabindex), so six cards cost a keyboard user one Tab, not six.
//   - A pop-up for the card being pointed at, tapped or focused: name,
//     category, priority, version (with what was asked for, once sent back)
//     and where it stands in the queue. Mouse: hover. Touch: tap to open, tap
//     anywhere else to close. Keyboard: focus opens it, Escape closes it.
//   - The gate's quiet label, "waits for a yes", which gives way to "Sent" for
//     a moment each time a card goes through. It sits under the ring, clear of
//     the path an approved card leaves by.
//
// The pop-up repeats what each button's accessible name already says, so it
// is hidden from assistive tech rather than read twice.

export interface LoopItem {
  id: string;
  name: string;
  category: CategoryKey;
  /** 1 low, 2 medium, 3 high. */
  priority: 1 | 2 | 3;
  priorityLabel: string;
  version: number;
  /** What the visitor asked for when they sent it back ("suggest another time"). */
  reason: string | null;
}

export interface LoopOverlayHandle {
  update(snap: SceneSnapshot): void;
}

type Open = { id: string; via: "hover" | "tap" | "key" } | null;

function versionLine(it: LoopItem) {
  return it.version > 1 && it.reason ? `V${it.version}, you asked: ${it.reason}` : `V${it.version}, first draft`;
}
function positionLine(index: number) {
  return index === 0 ? "At the gate, waiting for a yes" : `Number ${index + 1} in the queue`;
}
function accessibleName(it: LoopItem, index: number) {
  return `${it.name}. ${CATEGORIES[it.category].long}, ${it.priorityLabel.toLowerCase()} priority. ${versionLine(it)}. ${positionLine(index)}.`;
}

export function PriorityBars({ level, className }: { level: 1 | 2 | 3; className?: string }) {
  return (
    <svg viewBox="0 0 11 9" width="11" height="9" aria-hidden="true" className={className}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={i * 4}
          y={9 - (3 + i * 3)}
          width={3}
          height={3 + i * 3}
          rx={0.8}
          fill="currentColor"
          fillOpacity={i < level ? 1 : 0.28}
        />
      ))}
    </svg>
  );
}

export function LoopOverlay({
  items,
  onHighlight,
  ref,
}: {
  items: LoopItem[];
  onHighlight: (id: string | null) => void;
  ref?: Ref<LoopOverlayHandle>;
}) {
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const boxes = useRef(new Map<string, { x: number; y: number; w: number; h: number }>());
  const stage = useRef({ w: 0, h: 0 });
  const gateEl = useRef<HTMLDivElement>(null);
  const popEl = useRef<HTMLDivElement>(null);
  const popSize = useRef({ w: 0, h: 0 });
  const lastPointer = useRef<string>("mouse");
  const [open, setOpen] = useState<Open>(null);
  const openRef = useRef<Open>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [sent, setSent] = useState(false);
  const sentRef = useRef(false);

  const index = (id: string | null) => (id ? items.findIndex((i) => i.id === id) : -1);

  // Keep the frame loop's view of `open` current without re-creating the handle.
  useEffect(() => {
    openRef.current = open;
    onHighlight(open?.id ?? null);
    if (open) setShown(open.id);
  }, [open, onHighlight]);

  // A card that left the queue (approved) takes its pop-up with it.
  useEffect(() => {
    if (open && index(open.id) < 0) setOpen(null);
    if (active >= items.length) setActive(Math.max(0, items.length - 1));
  });

  const place = useCallback(() => {
    const cur = openRef.current;
    const pop = popEl.current;
    if (!cur || !pop) return;
    const b = boxes.current.get(cur.id);
    if (!b) return;
    const { w: pw, h: ph } = popSize.current;
    const margin = 8;
    const W = stage.current.w;
    const x = Math.min(Math.max(b.x + b.w / 2, pw / 2 + margin), Math.max(pw / 2 + margin, W - pw / 2 - margin));
    let y = b.y - 10;
    let side = "above";
    if (y - ph < margin) {
      y = b.y + b.h + 10;
      side = "below";
    }
    pop.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    pop.dataset.side = side;
  }, []);

  // Measure the pop-up once per content change, never inside the frame loop.
  useLayoutEffect(() => {
    const pop = popEl.current;
    if (!pop) return;
    popSize.current = { w: pop.offsetWidth, h: pop.offsetHeight };
    place();
  }, [shown, items, place]);

  useImperativeHandle(
    ref,
    () => ({
      update(snap) {
        stage.current.w = snap.width;
        stage.current.h = snap.height;
        for (let i = 0; i < snap.count; i++) {
          const c = snap.cards[i]!;
          const box = boxes.current.get(c.id) ?? { x: 0, y: 0, w: 0, h: 0 };
          box.x = c.x;
          box.y = c.y;
          box.w = c.w;
          box.h = c.h;
          boxes.current.set(c.id, box);
          const el = cardEls.current.get(c.id);
          if (!el) continue;
          el.style.transform = `translate3d(${(c.x + c.w / 2).toFixed(1)}px, ${(c.y + c.h / 2).toFixed(1)}px, 0)`;
          el.style.width = `${c.w.toFixed(1)}px`;
          el.style.height = `${c.h.toFixed(1)}px`;
          el.dataset.placed = "true";
        }
        const g = gateEl.current;
        if (g) {
          g.style.transform = `translate3d(${snap.gate.labelX.toFixed(1)}px, ${snap.gate.labelY.toFixed(1)}px, 0)`;
          g.dataset.placed = "true";
        }
        if (snap.gate.sent !== sentRef.current) {
          sentRef.current = snap.gate.sent;
          setSent(snap.gate.sent);
        }
        place();
      },
    }),
    [place],
  );

  // Touch: a tap anywhere outside the cards closes a tapped pop-up.
  useEffect(() => {
    if (open?.via !== "tap") return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      for (const el of cardEls.current.values()) if (target && el.contains(target)) return;
      setOpen(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const focusCard = (i: number) => {
    const it = items[i];
    if (!it) return;
    setActive(i);
    cardEls.current.get(it.id)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = Math.max(0, index((document.activeElement as HTMLElement | null)?.dataset.id ?? null));
    const n = items.length;
    if (!n) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusCard((i + 1) % n);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusCard((i - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusCard(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusCard(n - 1);
    } else if (e.key === "Escape" && openRef.current) {
      e.preventDefault();
      setOpen(null);
    }
  };

  const shownItem = items.find((i) => i.id === shown) ?? null;
  const shownIndex = index(shown);

  return (
    <div className={styles.layer}>
      <div role="group" aria-label="Tasks in the approval queue. Use the arrow keys to move between them." onKeyDown={onKeyDown}>
        {items.map((it, i) => (
          <button
            key={it.id}
            ref={(el) => {
              if (el) cardEls.current.set(it.id, el);
              else cardEls.current.delete(it.id);
            }}
            type="button"
            data-id={it.id}
            tabIndex={i === active ? 0 : -1}
            aria-label={accessibleName(it, i)}
            className={styles.card}
            onPointerDown={(e) => {
              lastPointer.current = e.pointerType;
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setOpen({ id: it.id, via: "hover" });
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse" && openRef.current?.id === it.id && openRef.current.via === "hover") setOpen(null);
            }}
            onFocus={(e) => {
              setActive(i);
              if (e.currentTarget.matches(":focus-visible")) setOpen({ id: it.id, via: "key" });
            }}
            onBlur={() => {
              if (openRef.current?.id === it.id && openRef.current.via !== "hover") setOpen(null);
            }}
            onClick={(e) => {
              const cur = openRef.current;
              if (e.detail === 0) {
                // Enter or Space.
                setOpen(cur?.id === it.id ? null : { id: it.id, via: "key" });
              } else if (lastPointer.current !== "mouse") {
                setOpen(cur?.id === it.id ? null : { id: it.id, via: "tap" });
              }
            }}
          >
            {it.version > 1 ? (
              <span aria-hidden="true" className={styles.badge}>
                V{it.version}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div ref={gateEl} aria-hidden="true" className={styles.gate} data-sent={sent || undefined}>
        <span className={styles.wait}>waits for a yes</span>
        <span className={styles.sent}>
          Sent
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div ref={popEl} aria-hidden="true" className={styles.pop} data-open={open ? "true" : undefined}>
        {shownItem ? (
          <>
            <p className={styles.popName}>{shownItem.name}</p>
            <p className={styles.popMeta}>
              <span className={styles.dot} style={{ background: CATEGORIES[shownItem.category].hex }} />
              {CATEGORIES[shownItem.category].long}
              <span className={styles.sep}>·</span>
              <PriorityBars level={shownItem.priority} className={styles.bars} />
              {shownItem.priorityLabel}
            </p>
            <p className={styles.popVersion}>{versionLine(shownItem)}</p>
            <p className={styles.popPos}>{positionLine(shownIndex)}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
