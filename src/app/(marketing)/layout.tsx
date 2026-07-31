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
// UPGRADE FOOTGUN, worth knowing before a Next bump: the flag is
// experimental.viewTransition in next.config.ts, and the import resolves
// because Next aliases react to its vendored build and ships a
// react/experimental triple-slash reference in dist/types.d.ts. Stable react
// does not export ViewTransition. If a future Next drops either, this import
// fails typecheck, which is a loud build failure rather than a silent one.
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
