import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactCTA } from "@/components/home/ContactCTA";
import {
  StructuredDataBreadcrumb,
  StructuredDataCaseStudy,
} from "@/components/site/StructuredData";
import { CaseCover } from "@/components/work/CaseCover";
import { CaseLedger } from "@/components/work/CaseLedger";
import { CaseBody, type ShortSection } from "@/components/work/CaseBody";
import { CaseAside, PageIndex, type TocItem } from "@/components/work/CaseAside";
import { DemoShot } from "@/components/work/DemoShot";
import { NextStudy } from "@/components/work/NextStudy";
import { demoSceneFor, keepCompounds, leadLine, splitBody } from "@/components/work/model";
import { loadCaseStudies } from "@/content/loaders";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const studies = await loadCaseStudies();
  return studies.map((s) => ({ slug: s.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const studies = await loadCaseStudies();
  const cs = studies.find((x) => x.meta.slug === slug);
  if (!cs) return { title: "Not found" };
  return buildMetadata({
    title: cs.meta.title,
    description: cs.meta.metaDescription ?? cs.meta.summary,
    path: `/work/${slug}`,
    ogImage: cs.meta.cover.src,
    ogType: "article",
    publishedTime: cs.meta.publishedAt,
  });
}

// A case study reads top to bottom as: the claim (header), the shape of the
// work (cover), the facts (at a glance), the short story, the long version,
// the sample-data demo where one exists, then the next study. On desktop a
// rail beside the reading column indexes the sections; on phones the same
// index folds into a disclosure under "At a glance".
//
// The lede is the study's one-liner (homeLine), the same promise its index
// card makes. The long summary stays the meta description and structured
// data; a study without a one-liner leads with its summary's first sentence.
export default async function CaseStudyPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const studies = await loadCaseStudies();
  const index = studies.findIndex((x) => x.meta.slug === slug);
  if (index < 0) notFound();
  const cs = studies[index]!;
  const next = studies.length > 1 ? studies[(index + 1) % studies.length]! : null;

  const short: ShortSection[] = [
    { id: "what-was-going-wrong", title: "What was going wrong", body: cs.meta.problem },
    { id: "what-i-did", title: "What I did", body: cs.meta.approach },
    { id: "what-changed", title: "What changed", body: cs.meta.outcome },
  ];
  const chunks = splitBody(cs.body);
  const timelines = [...short, ...chunks].map((_, i) => `--cs-${i}`);
  const toc: TocItem[] = [
    ...short.map((s, i) => ({ id: s.id, title: s.title, timeline: timelines[i]! })),
    ...chunks.flatMap((c, i) =>
      c.id && c.title ? [{ id: c.id, title: c.title, timeline: timelines[short.length + i]! }] : [],
    ),
  ];
  const scene = demoSceneFor(cs.meta);

  return (
    <div>
      <StructuredDataCaseStudy
        title={cs.meta.title}
        description={cs.meta.summary}
        url={`${SITE.url}/work/${slug}`}
        publishedAt={cs.meta.publishedAt}
        author={SITE.author}
        image={cs.meta.cover.src}
      />
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Work", url: `${SITE.url}/work` },
          { name: cs.meta.client, url: `${SITE.url}/work/${slug}` },
        ]}
      />

      <PageHeader
        eyebrow="Work"
        eyebrowHref="/work"
        title={keepCompounds(cs.meta.title)}
        titleTransition={`case-${slug}`}
        lede={keepCompounds(leadLine(cs.meta))}
        rule={false}
      />

      {/* No client line on the cover: "At a glance" prints it just below. */}
      <CaseCover slug={slug} variant="detail" animate />

      <CaseLedger meta={cs.meta} className="mt-10 md:mt-14" />
      <PageIndex toc={toc} demo={cs.meta.demo} />

      <div
        className="mt-16 grid gap-14 md:mt-24 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_16rem]"
        style={{ timelineScope: timelines.join(", ") } as CSSProperties}
      >
        <article className="read-track min-w-0 max-w-[68ch]">
          <CaseBody short={short} chunks={chunks} testimonial={cs.meta.testimonial} timelines={timelines} />
        </article>
        <CaseAside toc={toc} demo={cs.meta.demo} stack={cs.meta.stack} />
      </div>

      {scene && cs.meta.demo ? <DemoShot scene={scene} href={cs.meta.demo.href} /> : null}

      {next ? <NextStudy next={next.meta} /> : null}

      <div className="mt-24 md:mt-32">
        {/* The testimonial, when a study has one, is this page's serif moment. */}
        <ContactCTA voice={!cs.meta.testimonial} />
      </div>
    </div>
  );
}
