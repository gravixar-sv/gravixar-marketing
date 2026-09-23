import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { DemoGrid } from "@/components/home/Demos";
import { ContactCTA } from "@/components/home/ContactCTA";
import { PageLight } from "@/components/conversion/PageLight";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Live demos: five working apps you can click through",
  description:
    "Five live scenes at demo.gravixar.com, one per buyer: agency operating system, AI-agent console, founder cockpit, brand agent, billing portal. No signup.",
  path: "/demos",
});

// A page of its own, not the homepage section mounted again. The grid sits in
// a <Reveal> so its stagger actually runs (.reveal-stagger only animates under
// a .reveal ancestor, and this page used to have none). The sandbox line that
// floated between the grid and the closing panel is folded into the lede.
// The PageHeader has no serif accent, so the closing panel keeps its own.
export default function DemosIndexPage() {
  return (
    <div className="relative isolate">
      <PageLight />
      <PageHeader
        eyebrow="Demos"
        title="Five working apps. One for each kind of desk."
        lede="Each one is a real app running live, not a recording. Sample data, no signup, and nothing you click is saved. Pick the one closest to your work and see how it runs before you ever talk to me."
      />

      <Reveal className="mt-12 md:mt-16">
        <DemoGrid priority />
      </Reveal>

      <p className="mt-20 max-w-[52ch] text-lead text-ink-300 md:mt-28">
        None of these is a client&apos;s system. Each one is built separately, on purpose, so
        you can press every button.
      </p>

      <div className="mt-12 md:mt-16">
        <ContactCTA />
      </div>
    </div>
  );
}
