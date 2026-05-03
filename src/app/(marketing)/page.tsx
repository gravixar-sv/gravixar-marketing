import { loadHomeBlock, loadServices } from "@/content/loaders";
import { Hero } from "@/components/home/Hero";
import { Proof } from "@/components/home/Proof";
import { ServicesPreview } from "@/components/home/ServicesPreview";
import { ContactCTA } from "@/components/home/ContactCTA";

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
      <Proof meta={proof.meta} body={proof.body} />
      <ServicesPreview services={services.map((s) => s.meta)} />
      <ContactCTA />
    </div>
  );
}
