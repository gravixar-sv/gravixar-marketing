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
//
// The h1 is two sentences on two lines. Set as one string it broke mid-idea
// ("Five working apps. One / for each kind of desk."), and PageHeader's only
// forced break is the one before its serif accent. So the second sentence is
// the accent, which makes the h1 this page's one serif phrase, and the closing
// panel passes voice={false} and sets its tail in the muted sans instead.
export default function DemosIndexPage() {
  return (
    <div className="relative isolate">
      <PageLight />
      <PageHeader
        eyebrow="Demos"
        title="Five working apps."
        accent="One for each kind of desk."
        accentBreak
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
        <ContactCTA voice={false} />
      </div>
    </div>
  );
}
