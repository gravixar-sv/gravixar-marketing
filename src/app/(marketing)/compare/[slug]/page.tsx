import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import {
  StructuredDataBreadcrumb,
  StructuredDataFAQ,
} from "@/components/site/StructuredData";
import { loadCompares } from "@/content/loaders";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const items = await loadCompares();
  return items.map((c) => ({ slug: c.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const items = await loadCompares();
  const c = items.find((x) => x.meta.slug === slug);
  if (!c) return { title: "Not found" };
  return buildMetadata({
    title: c.meta.title,
    description: c.meta.summary,
    path: `/compare/${slug}`,
    ogKind: "comparison",
  });
}

export default async function ComparePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const items = await loadCompares();
  const c = items.find((x) => x.meta.slug === slug);
  if (!c) notFound();

  const url = `${SITE.url}/compare/${slug}`;

  return (
    <div className="space-y-16">
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Compare", url: `${SITE.url}/compare` },
          { name: c.meta.competitor, url },
        ]}
      />
      <StructuredDataFAQ faqs={c.meta.faqs} />

      <PageHeader
        eyebrow={`${c.meta.competitor} vs custom · ${c.meta.category}`}
        title={c.meta.title}
        lede={c.meta.summary}
      />

      <div className="grid gap-12 md:grid-cols-3">
        <article className="prose-invert md:col-span-2">
          <blockquote className="rounded-lg border-l-2 border-brand bg-zinc-950/60 px-5 py-4 text-zinc-200">
            <p className="text-base italic leading-relaxed">{c.meta.hook}</p>
          </blockquote>

          <div className="mt-8">
            <MDX source={c.body} />
          </div>

          <section className="mt-16">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              FAQ
            </h2>
            <dl className="mt-6 space-y-6">
              {c.meta.faqs.map((f) => (
                <div key={f.question}>
                  <dt className="text-base font-medium text-zinc-100">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <aside className="space-y-8">
          <Meta label="Competitor" value={c.meta.competitor} />
          <Meta label="Category" value={c.meta.category} />
          <div>
            <p className="font-mono text-label uppercase text-brand">
              when to pick {c.meta.competitor}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {c.meta.whoForCompetitor}
            </p>
          </div>
          <div>
            <p className="font-mono text-label uppercase text-brand">
              when to go custom
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {c.meta.whoForCustom}
            </p>
          </div>

          {c.meta.linkedCaseStudy || c.meta.linkedService ? (
            <div>
              <p className="font-mono text-label uppercase text-brand">
                related
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {c.meta.linkedCaseStudy ? (
                  <li>
                    <Link
                      href={`/work/${c.meta.linkedCaseStudy}`}
                      className="text-brand-soft underline-offset-4 hover:underline"
                    >
                      Case study →
                    </Link>
                  </li>
                ) : null}
                {c.meta.linkedService ? (
                  <li>
                    <Link
                      href={`/services/${c.meta.linkedService}`}
                      className="text-brand-soft underline-offset-4 hover:underline"
                    >
                      Service →
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <ContactCTA />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-label uppercase text-brand">
        {label}
      </p>
      <p className="mt-2 text-sm text-zinc-200">{value}</p>
    </div>
  );
}
