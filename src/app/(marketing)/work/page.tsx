import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { ContactCTA } from "@/components/home/ContactCTA";
import { CaseRow, FeaturedCase, PairCase } from "@/components/work/CaseIndex";
import { hasWhatBroke } from "@/components/work/model";
import { loadCaseStudies } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Case studies: what I built for clients, and what broke",
  description:
    "Real client projects, from custom portals with AI inside to a Dropbox replacement: what I built, and what it changed.",
  path: "/work",
});

// Curated order (frontmatter `order`) drives the tiers: the first study is
// the feature, the next two a pair, the rest editorial rows.
//
// The feature and pair are not a <SpotlightGrid>: its edge light is coral, and
// coral marks a human decision, never a hover. Each cover has its own causal
// hover instead (the ember brightens and the drawing settles 4px).
export default async function WorkIndexPage() {
  const studies = (await loadCaseStudies()).map((s) => ({ meta: s.meta, broke: hasWhatBroke(s.body) }));
  const [lead, ...others] = studies;
  const pair = others.slice(0, 2);
  const rows = others.slice(2);

  return (
    <div>
      <PageHeader
        eyebrow={`Work · ${studies.length} case studies`}
        title="What I built, what worked,"
        accent="and what broke."
        lede="Real client projects, and what each one changed. Some have a section on what broke. Read those first."
        rule={false}
      >
        <p className="text-caption text-ink-500">Client names are left out unless the client agreed.</p>
      </PageHeader>

      {lead ? (
        <div className="mt-4 md:mt-6">
          <div className="hero-enter [animation-delay:380ms]">
            <FeaturedCase study={lead} />
          </div>
          {pair.length > 0 ? (
            <Reveal className="mt-20 md:mt-28">
              <div className="reveal-stagger grid gap-x-10 gap-y-16 md:grid-cols-2">
                {pair.map((s) => (
                  <PairCase key={s.meta.slug} study={s} />
                ))}
              </div>
            </Reveal>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-400">No case studies published yet.</p>
      )}

      {rows.length > 0 ? (
        <section aria-labelledby="more-work" className="mt-24 md:mt-32">
          <h2 id="more-work" className="text-caption font-normal tracking-normal text-ink-400 [font-stretch:100%]">
            More case studies
          </h2>
          <Reveal className="reveal-quiet mt-4">
            <ul className="border-b border-line">
              {rows.map((s) => (
                <CaseRow key={s.meta.slug} study={s} />
              ))}
            </ul>
          </Reveal>
        </section>
      ) : null}

      <div className="mt-24 md:mt-32">
        {/* The header's serif tail is this page's one serif phrase. */}
        <ContactCTA voice={false} />
      </div>
    </div>
  );
}
