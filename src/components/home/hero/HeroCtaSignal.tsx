"use client";

import { useEffect } from "react";

// One coral fill per viewport. On the homepage the header's "Ops Leak Audit"
// and the hero's "Start with the Ops Leak Audit" go to the same page, and two
// coral buttons in one view means neither reads as the primary action. This
// publishes whether the hero's primary CTA is on screen, as
//
//   <html data-hero-cta="visible" | "gone">
//
// so the header can render its CTA quiet while the hero's is in view and
// coral once it has scrolled away. The attribute exists only while the
// homepage is mounted (removed on unmount), so every other route keeps the
// coral header CTA. Before hydration, and with scripting off, it is absent.
//
// The header is sticky, so a CTA scrolled under it counts as gone: the
// observer's top edge is the header's bottom edge, not the viewport's.
//
// The CTA itself is marked data-hero-primary, a different name on purpose:
// a [data-hero-cta] selector would also match <html> once this has run.
export function HeroCtaSignal() {
  useEffect(() => {
    const target = document.querySelector("main a[data-hero-primary]");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const header = document.querySelector(".site-header");
    const top = Math.round(header?.getBoundingClientRect().height ?? 64);
    const io = new IntersectionObserver(
      ([entry]) => {
        root.dataset.heroCta = entry?.isIntersecting ? "visible" : "gone";
      },
      { rootMargin: `-${top}px 0px 0px 0px` },
    );
    io.observe(target);
    return () => {
      io.disconnect();
      delete root.dataset.heroCta;
    };
  }, []);
  return null;
}
