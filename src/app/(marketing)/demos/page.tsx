import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { DemoGrid } from "@/components/home/Demos";
import { ContactCTA } from "@/components/home/ContactCTA";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Live demos: five working apps you can click through",
  description:
    "demo.gravixar.com runs five live scenes, one per buyer: a creative-agency operating system, a supervised AI-agent console, a solo-founder cockpit, a brand agent for DTC, and a medical billing and credentialing portal. Real apps with sample data, no signup.",
  path: "/demos",
});

export default function DemosIndexPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="demos"
        title="Five working apps. One for each kind of desk."
        lede="Each scene below is a real app running on demo.gravixar.com, not a recording. Sample data, no signup. Pick the one closest to your work, click in, and run the loop yourself before we ever talk."
      />

      <DemoGrid priority />

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        sandbox · each scene has its own brand and sample data, and nothing you press is saved
      </p>

      <ContactCTA />
    </div>
  );
}
