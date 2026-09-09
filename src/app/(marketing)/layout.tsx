import { ViewTransition } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { DemoBanner } from "@/components/site/DemoBanner";
import { BosunMount } from "@/components/chat/BosunMount";

// Marketing chrome wrapper. Applied to every page in the (marketing)
// route group: DemoBanner top, Navbar, content max-w-6xl, Footer.
// /admin and other non-marketing routes don't get this layer.
//
// THE VIEW TRANSITION IS WRAPPED HERE, AROUND <main> ONLY, AND THAT PLACEMENT
// IS THE WHOLE POINT. React assigns a transition name per HOST CHILD, so a
// wrapper one level up in the root layout fans this fragment out into four
// independent groups: the DemoBanner, the sticky backdrop-blur header, main,
// and the footer. That is not a cosmetic difference, it is a visible
// regression on every navigation. A snapshot has no live backdrop, so the
// blurred header goes flat for the duration, and the footer sits at wildly
// different Y offsets between a long page and a short one, so its group would
// interpolate position and slide content that is supposed to be static.
// Only the content region should cross-fade. Do not hoist this.
//
// UPGRADE FOOTGUN — THIS FIRED ON 2026-09-09, and the note was half right.
//
// It predicted that a Next bump could break this, and that the failure would
// be loud rather than silent. Both held. What it got wrong was WHICH half
// would go: the prediction was that the react/experimental types reference
// would disappear and this import would fail. Instead Next 16.3.4 kept the
// types reference and removed the CONFIG FLAG, so the build failed in
// next.config.ts (TS2353 + an "Unrecognized key(s)" validator warning) and
// this import never moved.
//
// The feature survived the flag's removal. Verified by building with the flag
// gone: all 78 static pages prerender, which is impossible if <ViewTransition>
// were undefined — React throws "Element type is invalid" at prerender for
// every page under this layout. The import still resolves because Next
// continues to alias react to its vendored build and ship the
// react/experimental triple-slash reference in dist/types.d.ts.
//
// So the standing risk is unchanged and still loud: if a future Next drops the
// types reference, this import fails typecheck. Stable react does not export
// ViewTransition.
// Reduced motion is handled in globals.css, on the ::view-transition-* pseudos.

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DemoBanner />
      <Navbar />
      <ViewTransition>
        <main className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-16">{children}</main>
      </ViewTransition>
      <Footer />
      {/* Outside the ViewTransition boundary on purpose: the panel is fixed
          and route-independent, so snapshotting it would cross-fade an open
          conversation on every navigation. Renders a closed launcher and
          nothing else until somebody clicks it. */}
      <BosunMount />
    </>
  );
}
