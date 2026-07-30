import { loadHomeBlock, loadServices } from "@/content/loaders";
import { Hero } from "@/components/home/Hero";
import { Loop } from "@/components/home/Loop";
import { Proof } from "@/components/home/Proof";
import { Demos } from "@/components/home/Demos";
import { ServicesPreview } from "@/components/home/ServicesPreview";
import { ManagedServices } from "@/components/home/ManagedServices";
import { Capabilities } from "@/components/home/Capabilities";
import { ContactCTA } from "@/components/home/ContactCTA";
import { Reveal } from "@/components/site/Reveal";

export const revalidate = 3600;

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
  // every intra-act gap (56/80/88/96px), which is what makes the structure felt
  // rather than explained. Note Hero pays its own pb-10/md:pb-12, so the
  // claim-act gap is 72/88px, not the mt-8/md:mt-10 alone.
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
      {/* One Reveal for both, because managed website retainers are not one of
          the numbered service files above, so they read as a subsection rather
          than a sixth offer. The 56px internal gap is the smallest gap on
          the page on purpose: it is the only thing that makes the demotion read
          as nesting instead of an orphaned fragment. */}
      <Reveal className="mt-28 md:mt-36">
        <ServicesPreview services={services.map((s) => s.meta)} />
        <div className="mt-14">
          <ManagedServices />
        </div>
      </Reveal>
      <Reveal className="reveal-lead mt-32 md:mt-40">
        <ContactCTA />
      </Reveal>
    </div>
  );
}
