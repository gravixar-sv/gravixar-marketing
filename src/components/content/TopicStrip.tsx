"use client";

import { useEffect, useRef, type ReactNode } from "react";

// The scrolling <ul> of the topics row. The only thing it adds to the server
// markup: on a phone, where the row scrolls sideways, a hub page whose own
// topic starts past the right-edge fade opens with the row already scrolled to
// it, so the reader can see which topic they are in. Instant, once per topic,
// and only when the item is actually hidden, so there is no motion to reduce
// and nothing moves on a page where the current item was already in view.
// From md the row wraps and every item is visible, so this does nothing there.
export function TopicStrip({
  current,
  className,
  children,
}: {
  /** Changes when the current topic does, so a client navigation from one
   *  hub to another re-runs the check on the reused list. */
  current: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const ul = ref.current;
    if (!ul || !window.matchMedia("(max-width: 47.99rem)").matches) return;
    const active = ul.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const box = ul.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    // The strip fades out over its last 18%; clear of that, leave it alone.
    if (item.left >= box.left && item.right <= box.left + box.width * 0.82) return;
    // Land the current item on the page gutter (24px), where the row starts.
    ul.scrollLeft += item.left - box.left - 24;
  }, [current]);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
