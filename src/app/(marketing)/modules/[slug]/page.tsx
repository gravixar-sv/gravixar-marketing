import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { ArticleBody, RailBlock } from "@/components/content/ArticleBody";
import { extractToc } from "@/components/content/longform";
import { MODULE_CATEGORY_LABELS } from "@/components/content/modules";
import { Arrow } from "@/components/ui/Button";
import { loadModules } from "@/content/loaders";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const items = await loadModules();
  return items.map((m) => ({ slug: m.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const items = await loadModules();
  const m = items.find((x) => x.meta.slug === slug);
  if (!m) return { title: "Not found" };
  return buildMetadata({
    title: `${m.meta.title}, module`,
    description: m.meta.metaDescription ?? m.meta.summary,
    path: `/modules/${slug}`,
    ogKind: "module",
  });
}

// A module page is short (two or three paragraphs), so the rail carries the
// facts instead of a contents list: where it runs, what it is built with. On a
// phone those stack after the body. It closes on the rest of its category, so
// a reader browsing the library is never sent back to the index to continue.
export default async function ModulePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const items = await loadModules();
  const m = items.find((x) => x.meta.slug === slug);
  if (!m) notFound();

  const url = `${SITE.url}/modules/${slug}`;
  const category = MODULE_CATEGORY_LABELS[m.meta.category];
  const siblings = items.filter((x) => x.meta.category === m.meta.category && x.meta.slug !== slug);

  return (
    <div>
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Modules", url: `${SITE.url}/modules` },
          { name: m.meta.title, url },
        ]}
      />

      {/* No .read-track here. A module page is about one screen long, and a
          reading-progress line on it loaded a third full before the reader had
          scrolled at all. */}
      <article>
        <PageHeader
          eyebrow="Module library"
          eyebrowHref="/modules"
          title={m.meta.title}
          lede={m.meta.summary}
        />

        <ArticleBody
          toc={extractToc(m.body)}
          className="mt-12 md:mt-16"
          rail={
            <div className="grid gap-8 border-t border-line-soft pt-8 sm:grid-cols-2 lg:grid-cols-1 lg:border-t-0 lg:pt-0">
              <RailBlock label="Runs in">
                <ul className="space-y-2">
                  {m.meta.runningIn.map((r, i) => (
                    <li key={`${r.client}-${i}`} className="text-[0.9375rem] leading-snug">
                      {r.productSlug ? (
                        <Link href={`/work/${r.productSlug}`} className="link-quiet">
                          {r.client}
                        </Link>
                      ) : (
                        <span className="text-ink-200">{r.client}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </RailBlock>
              {m.meta.stack.length > 0 ? (
                <RailBlock label="Built with">
                  <ul className="space-y-2 text-[0.9375rem] leading-snug text-ink-300">
                    {m.meta.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </RailBlock>
              ) : null}
            </div>
          }
        >
          <MDX source={m.body} />
        </ArticleBody>
      </article>

      {siblings.length > 0 ? (
        <section aria-labelledby="more-in" className="mt-20 md:mt-28">
          <h2 id="more-in" className="text-subsection font-semibold text-ink-50">
            Related modules
          </h2>
          <p className="mt-2 text-caption text-ink-500">Also in {category}</p>
          <ul className="mt-6 border-t border-line-soft">
            {siblings.map((s) => (
              <li key={s.meta.slug} className="group border-b border-line-soft transition-colors hover:border-line">
                <Link
                  href={`/modules/${s.meta.slug}`}
                  className="flex min-h-11 items-baseline justify-between gap-6 py-5"
                >
                  <span className="text-[1.0625rem] font-semibold text-ink-200 transition-colors group-hover:text-ink-50">
                    {s.meta.title}
                  </span>
                  <span aria-hidden className="text-ink-400 transition-colors group-hover:text-ink-50">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-20 md:mt-28">
        <ContactCTA compact />
      </div>
    </div>
  );
}
