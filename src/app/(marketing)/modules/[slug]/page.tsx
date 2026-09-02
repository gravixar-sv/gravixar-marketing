import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { MDX } from "@/content/mdx";
import { ContactCTA } from "@/components/home/ContactCTA";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
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
    description: m.meta.summary,
    path: `/modules/${slug}`,
    ogKind: "module",
  });
}

export default async function ModulePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const items = await loadModules();
  const m = items.find((x) => x.meta.slug === slug);
  if (!m) notFound();

  const url = `${SITE.url}/modules/${slug}`;

  return (
    <div className="space-y-16">
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Modules", url: `${SITE.url}/modules` },
          { name: m.meta.title, url },
        ]}
      />
      <PageHeader
        eyebrow={`module · ${m.meta.category}`}
        title={m.meta.title}
        lede={m.meta.summary}
      />

      <div className="grid gap-12 md:grid-cols-3">
        <article className="prose-invert md:col-span-2">
          <MDX source={m.body} />
        </article>

        <aside className="space-y-8">
          <div>
            <p className="font-mono text-label uppercase text-brand">
              running in
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {m.meta.runningIn.map((r, i) => (
                <li key={`${r.client}-${i}`}>
                  {r.productSlug ? (
                    <Link
                      href={`/work/${r.productSlug}`}
                      className="text-brand-soft underline-offset-4 hover:underline"
                    >
                      {r.client} →
                    </Link>
                  ) : (
                    <span className="text-zinc-200">{r.client}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {m.meta.stack.length > 0 ? (
            <div>
              <p className="font-mono text-label uppercase text-brand">
                stack
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {m.meta.stack.map((s) => (
                  <li
                    key={s}
                    className="rounded-sm border border-zinc-800/80 bg-zinc-900/60 px-2 py-1 font-mono text-[10px] text-zinc-300"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="font-mono text-label uppercase text-brand">
              browse
            </p>
            <Link
              href="/modules"
              className="mt-3 block text-sm text-brand-soft underline-offset-4 hover:underline"
            >
              All modules →
            </Link>
          </div>
        </aside>
      </div>

      <ContactCTA />
    </div>
  );
}
