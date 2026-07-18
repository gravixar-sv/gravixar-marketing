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

  return (
    <div className="space-y-24 md:space-y-32">
      <Hero meta={hero.meta} body={hero.body} />
      <Reveal>
        <Loop />
      </Reveal>
      <Reveal>
        <Proof meta={proof.meta} body={proof.body} />
      </Reveal>
      <Reveal>
        <Demos />
      </Reveal>
      <Reveal>
        <ServicesPreview services={services.map((s) => s.meta)} />
      </Reveal>
      <Reveal>
        <ManagedServices />
      </Reveal>
      <Reveal>
        <Capabilities />
      </Reveal>
      <Reveal>
        <ContactCTA />
      </Reveal>
    </div>
  );
}
