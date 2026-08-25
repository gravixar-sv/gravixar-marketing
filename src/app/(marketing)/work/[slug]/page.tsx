import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import {
  StructuredDataBreadcrumb,
  StructuredDataCaseStudy,
} from "@/components/site/StructuredData";
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
    description: cs.meta.summary,
    path: `/work/${slug}`,
    ogImage: cs.meta.cover.src,
  });
}

export default async function CaseStudyPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const studies = await loadCaseStudies();
  const cs = studies.find((x) => x.meta.slug === slug);
  if (!cs) notFound();

  return (
    <div className="space-y-16">
      <StructuredDataCaseStudy
        title={cs.meta.title}
        description={cs.meta.summary}
        url={`${SITE.url}/work/${slug}`}
        publishedAt={cs.meta.publishedAt}
        author={SITE.author}
      />
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Work", url: `${SITE.url}/work` },
          { name: cs.meta.client, url: `${SITE.url}/work/${slug}` },
        ]}
      />
      <PageHeader
        eyebrow={`${cs.meta.client} · ${cs.meta.period}`}
        title={cs.meta.title}
        lede={cs.meta.summary}
      />

      <div className="grid gap-12 md:grid-cols-3">
        <article className="prose-invert md:col-span-2 space-y-12">
          <Section title="Problem" body={cs.meta.problem} />
          <Section title="Approach" body={cs.meta.approach} />
          <Section title="Outcome" body={cs.meta.outcome} />

          {cs.meta.testimonial ? (
            <figure className="border-l-2 border-brand/60 pl-5">
              <blockquote className="text-lg leading-relaxed text-zinc-200">
                &ldquo;{cs.meta.testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                {cs.meta.testimonial.attribution}
              </figcaption>
            </figure>
          ) : null}

          {cs.body.trim().length > 0 ? (
            <div>
              <h2 className="mt-12 text-2xl font-semibold tracking-tight">Notes</h2>
              <div className="mt-4">
                <MDX source={cs.body} />
              </div>
            </div>
          ) : null}
        </article>

        <aside className="space-y-8">
          <Meta label="Client" value={cs.meta.client} />
          <Meta label="Role" value={cs.meta.role} />
          <Meta label="Period" value={cs.meta.period} />
          {cs.meta.demo ? (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand">
                Related demo
              </p>
              <a
                href={cs.meta.demo.href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-zinc-200 transition-colors hover:text-brand-soft"
              >
                {cs.meta.demo.label} <span aria-hidden>↗</span>
              </a>
            </div>
          ) : null}
          {cs.meta.stack.length > 0 ? (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand">
                Stack
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {cs.meta.stack.map((s) => (
                  <li
                    key={s}
                    className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {cs.meta.metrics.length > 0 ? (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-brand">
                Metrics
              </p>
              <dl className="mt-3 space-y-3 text-sm">
                {cs.meta.metrics.map((m) => (
                  <div key={m.label}>
                    <dt className="text-zinc-500">{m.label}</dt>
                    <dd className="text-zinc-100">{m.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </aside>
      </div>

      <ContactCTA />
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      {/* Subsection rank: these are the Problem / Approach / Outcome headings
          inside a case study, a step under the page title and a step above the
          reference headings. Set from the named scale so the ladder stays
          retunable from @theme rather than drifting per page. */}
      <h2 className="text-2xl font-semibold tracking-tight md:text-subsection">{title}</h2>
      <p className="mt-3 leading-relaxed text-zinc-300">{body}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-brand">
        {label}
      </p>
      <p className="mt-2 text-sm text-zinc-200">{value}</p>
    </div>
  );
}
