import { loadHomeBlock, loadServices } from "@/content/loaders";
import { Hero } from "@/components/home/Hero";
import { Loop } from "@/components/home/Loop";
import { Proof } from "@/components/home/Proof";
import { Demos } from "@/components/home/Demos";
import { ServicesPreview } from "@/components/home/ServicesPreview";
import { Capabilities } from "@/components/home/Capabilities";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

// The homepage was the ONLY route on the site with no canonical, no OpenGraph
// and no Twitter card, because it was the only one that never called
// buildMetadata: it inherited title + description from the root layout and
// nothing else. That made the most-shared URL on the site the one that pasted
// into LinkedIn or Slack as a bare link with no card, and the only page with
// no self-referencing canonical to absorb the ?utm_* forms it arrives as.
//
// `title.absolute` rather than a plain string, because the root layout sets
// `template: "%s · Gravixar"` (layout.tsx:26) and a plain string would render
// "Gravixar · ... · Gravixar". The strings are copied verbatim from the root
// layout's own default + description so this adds a card, not a new claim.
const HOME_TITLE = "Gravixar · AI-ops platform with a human on every approval";
const HOME_DESCRIPTION =
  "Gravixar is an AI-ops platform: portals, intake wizards, and content agents that run your operations with a human on every write. In production before you buy.";

export const metadata: Metadata = {
  ...buildMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" }),
  title: { absolute: HOME_TITLE },
};

export default async function HomePage() {
  const [hero, proof, services] = await Promise.all([
    loadHomeBlock("hero"),
    loadHomeBlock("proof"),
    loadServices(),
  ]);

  // Four movements, not eight sections. A uniform space-y between every section
  // reads as a list, so the gaps are explicit per section instead: claim (Hero +
  // Loop, kept tight because the claim and its mechanism are one thought),
  // evidence (Proof, Demos, Capabilities), offer (the services menu), ask.
  // The invariant: every act boundary (128/144/160px at md) strictly exceeds
  // every intra-act gap (80/88/96px), which is what makes the structure felt
  // rather than explained. Note Hero pays its own pb-10/md:pb-12, so the
  // claim-act gap is 72/88px, not the mt-8/md:mt-10 alone. The old 56px gap
  // left the list when managed services became a service file: that raised the
  // page's smallest gap without moving a boundary, so 128 still clears 96 and
  // no spacing needed retuning to keep the four movements legible.
  // Reveal weight agrees with spacing so the two never argue:
  // reveal-lead (40px/820ms) on the three sections carrying the argument,
  // reveal-quiet (12px/480ms) on the reference material, base weight on the
  // offer block sitting between them.
  return (
    <div>
      <Hero meta={hero.meta} body={hero.body} />
      <Reveal className="reveal-lead mt-8 md:mt-10">
        <Loop />
      </Reveal>
      <Reveal className="reveal-quiet mt-24 md:mt-32">
        <Proof meta={proof.meta} body={proof.body} />
      </Reveal>
      <Reveal className="reveal-lead mt-16 md:mt-20">
        <Demos />
      </Reveal>
      {/* Capabilities closes the evidence act rather than preceding the ask: an
          integrations spec sheet immediately before the CTA stalls the page at
          its most decisive moment. */}
      <Reveal className="reveal-quiet mt-20 md:mt-24">
        <Capabilities />
      </Reveal>
      {/* The offer act is one section. Managed website retainers used to hang
          below the menu as a hand-written block, demoted to a subsection
          because they were not a service file. They are one now, on the
          maintain track, so the menu renders them as card 06 on their own
          full-width band and there is nothing left to nest. */}
      <Reveal className="mt-28 md:mt-36">
        <ServicesPreview services={services.map((s) => s.meta)} />
      </Reveal>
      <Reveal className="reveal-lead mt-32 md:mt-40">
        <ContactCTA />
      </Reveal>
    </div>
  );
}
