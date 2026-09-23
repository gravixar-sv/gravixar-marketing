import { loadCaseStudies, loadHomeBlock, loadServices } from "@/content/loaders";
import { Hero } from "@/components/home/Hero";
import { Loop } from "@/components/home/Loop";
import { SelectedWork } from "@/components/home/sections/SelectedWork";
import { Demos } from "@/components/home/Demos";
import { ServicesPreview } from "@/components/home/ServicesPreview";
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
const HOME_TITLE = "Gravixar · The AI-ops platform that asks before it acts";
const HOME_DESCRIPTION =
  "Client portals, intake forms, and AI that drafts the work, with a person approving every action before it happens. See each one running before you buy.";

export const metadata: Metadata = {
  ...buildMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" }),
  title: { absolute: HOME_TITLE },
};

export default async function HomePage() {
  const [hero, proof, services, studies] = await Promise.all([
    loadHomeBlock("hero"),
    loadHomeBlock("proof"),
    loadServices(),
    loadCaseStudies(),
  ]);

  // FIVE MOVEMENTS, felt through spacing rather than labels (2026-09-23):
  //   claim     Hero + Loop, tight, because the claim and its mechanism are
  //             one thought;
  //   evidence  Selected work (real engagements, with the client rail and the
  //             counted ledger as its caption), then Demos (try it yourself);
  //   offer     the audit as the front door, the other services as rows;
  //   ask       the closing panel.
  // The invariant: every act boundary (112px, 160px at md) strictly exceeds
  // every gap inside an act (96px, 128px at md), so the structure is felt
  // rather than explained. Hero pays its own bottom padding, so the claim
  // act's inner gap is smaller still.
  //
  // CAPABILITIES LEFT THE HOMEPAGE. It used to close the evidence act, an
  // engineer's spec sheet between the proof and the offer that pushed the
  // services to roughly screen 9 of 13 on a phone. It now lives on /about as
  // reference, and the evidence act is outcomes (Selected work) plus the
  // product itself (Demos). The client rail moved under Selected work as its
  // caption, since the logos only mean something next to what was built.
  //
  // Reveal weight agrees with spacing: reveal-lead on the two sections that
  // carry the argument (the real outcomes, the ask), the base weight on the
  // demos and the offer.
  //
  // One heading rank for every act opener: text-statement (defined in
  // globals.css for exactly this job). Inside an act the ladder steps down
  // from there (the offer's panel title is a subsection, its rows text-xl),
  // so no heading ever sits directly under another of the same size. Only
  // the Loop and the closing ask keep the two-tone device (ivory claim, muted
  // second sentence); the other openers are a single statement, so the device
  // stays a voice and does not become a template.
  return (
    <div>
      <Hero meta={hero.meta} body={hero.body} />
      <Reveal className="reveal-lead mt-8 md:mt-10">
        <Loop />
      </Reveal>
      <Reveal className="reveal-lead mt-28 md:mt-40">
        <SelectedWork studies={studies.map((s) => s.meta)} proof={proof} />
      </Reveal>
      <Reveal className="mt-24 md:mt-32">
        <Demos />
      </Reveal>
      {/* Brand work and managed services carry audience "existing-clients",
          so ServicesPreview names them in one sentence under the rows. The
          line comes from frontmatter, so nothing here is hand-written. */}
      <Reveal className="mt-28 md:mt-40">
        <ServicesPreview services={services.map((s) => s.meta)} />
      </Reveal>
      {/* voice={false}: the hero h1 already spends this page's one serif
          phrase, so the closing line renders as a two-tone statement.
          size="statement": the ask opens the last act, so it takes the same
          rank as every other homepage act opener.
          body: the offer panel one screen up already sells the audit, so the
          close leads with the free step (the demos, then the call), which is
          what "before you sign anything" promises. */}
      <Reveal className="reveal-lead mt-28 md:mt-40">
        <ContactCTA
          voice={false}
          size="statement"
          body={
            <>
              Every demo above opens without a sign-in. Rather talk first? Book
              a <span className="whitespace-nowrap">30-minute</span> call. If it
              is not a fit, you still leave with notes you can use.
            </>
          }
        />
      </Reveal>
    </div>
  );
}
