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
import { ArticleBody, RailBlock } from "@/components/content/ArticleBody";
import { extractToc } from "@/components/content/longform";
import { Arrow } from "@/components/ui/Button";
import { loadCaseStudies, loadCompares, loadServices } from "@/content/loaders";
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
    description: c.meta.metaDescription ?? c.meta.summary,
    path: `/compare/${slug}`,
    ogKind: "comparison",
  });
}

const FAQ_ID = "common-questions";

// The decision-useful copy leads. The two "who each is for" verdicts used to
// sit in a narrow aside that a phone reached only after the article and the
// FAQ; they now open the page, right under the header, at every width. The
// hook is the header's lede, set plain: the old coral side-stripe box was the
// one accent pattern the system rules out, around a synthesised italic.
export default async function ComparePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [items, studies, services] = await Promise.all([
    loadCompares(),
    loadCaseStudies(),
    loadServices(),
  ]);
  const c = items.find((x) => x.meta.slug === slug);
  if (!c) notFound();

  const url = `${SITE.url}/compare/${slug}`;
  const study = c.meta.linkedCaseStudy
    ? studies.find((s) => s.meta.slug === c.meta.linkedCaseStudy)
    : undefined;
  const service = c.meta.linkedService
    ? services.find((s) => s.meta.slug === c.meta.linkedService)
    : undefined;
  const toc = [...extractToc(c.body), { id: FAQ_ID, text: "Common questions" }];

  return (
    <div>
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Compare", url: `${SITE.url}/compare` },
          { name: c.meta.competitor, url },
        ]}
      />
      <StructuredDataFAQ faqs={c.meta.faqs} />

      <article className="read-track">
        <PageHeader
          eyebrow="Comparisons"
          eyebrowHref="/compare"
          title={c.meta.title}
          lede={c.meta.hook}
        />

        <section aria-labelledby="who-for" className="mt-12 md:mt-16">
          <h2 id="who-for" className="text-subsection font-semibold text-ink-50">
            Who each is for
          </h2>
          <div className="card-surface mt-6 grid overflow-hidden rounded-2xl md:grid-cols-2">
            <Verdict label={c.meta.competitor} text={c.meta.whoForCompetitor} />
            <Verdict
              label="A custom build"
              text={c.meta.whoForCustom}
              className="border-t border-line-soft md:border-l md:border-t-0"
            />
          </div>
        </section>

        <ArticleBody
          toc={toc}
          className="mt-16 md:mt-24"
          rail={
            study || service ? (
              <RailBlock label="Related">
                <ul className="space-y-4">
                  {study ? (
                    <RelatedLink
                      href={`/work/${study.meta.slug}`}
                      kind="Case study"
                      title={study.meta.title}
                    />
                  ) : null}
                  {service ? (
                    <RelatedLink
                      href={`/services/${service.meta.slug}`}
                      kind="Service"
                      title={service.meta.title}
                    />
                  ) : null}
                </ul>
              </RailBlock>
            ) : null
          }
        >
          <MDX source={c.body} />

          <section id={FAQ_ID} aria-labelledby={`${FAQ_ID}-h`} className="mt-16 scroll-mt-28">
            <h2
              id={`${FAQ_ID}-h`}
              className="text-[1.625rem] font-semibold leading-[1.18] tracking-[-0.02em] text-ink-50 md:text-subsection"
            >
              Common questions
            </h2>
            <dl className="mt-6 border-t border-line-soft">
              {c.meta.faqs.map((f) => (
                <div key={f.question} className="border-b border-line-soft py-6">
                  <dt className="text-[1.125rem] font-semibold leading-snug text-ink-100">
                    {f.question}
                  </dt>
                  <dd className="mt-2.5 text-prose text-ink-300">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </ArticleBody>
      </article>

      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}

function Verdict({
  label,
  text,
  className = "",
}: {
  label: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={`p-6 md:p-8 ${className}`}>
      <p className="text-caption font-medium text-ink-400">{label}</p>
      <p className="mt-3 max-w-[56ch] text-[1.0625rem] leading-relaxed text-ink-200">{text}</p>
    </div>
  );
}

// Links that say where they go: the linked page's own title, with its kind
// above it, instead of "Case study →".
function RelatedLink({ href, kind, title }: { href: string; kind: string; title: string }) {
  return (
    <li>
      <Link href={href} className="group block">
        <span className="block text-caption text-ink-500">{kind}</span>
        <span className="mt-1 block text-[0.9375rem] leading-snug text-ink-200 transition-colors group-hover:text-ink-50">
          {title} <Arrow />
        </span>
      </Link>
    </li>
  );
}
