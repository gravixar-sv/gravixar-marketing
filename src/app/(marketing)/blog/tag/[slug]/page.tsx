import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { PostList } from "@/components/site/PostList";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { loadTagHub, loadTagHubs } from "@/lib/blog-tags";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 1800;

export async function generateStaticParams() {
  const hubs = await loadTagHubs();
  return hubs.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const hub = await loadTagHub(slug);
  if (!hub) return { title: "Not found" };
  return buildMetadata({
    title: hub.title,
    description: hub.description,
    path: `/blog/tag/${hub.slug}`,
    // A tag on almost every post is /blog with a different heading, and a tag
    // on one or two is a thin page. Either way it stays crawlable and stays
    // out of the index. See lib/blog-tags.ts for the rule.
    noindex: !hub.indexable,
  });
}

export default async function BlogTagPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const hub = await loadTagHub(slug);
  if (!hub) notFound();

  const others = (await loadTagHubs()).filter((h) => h.slug !== hub.slug);

  return (
    <div className="space-y-16">
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Writing", url: `${SITE.url}/blog` },
          { name: hub.label, url: `${SITE.url}/blog/tag/${hub.slug}` },
        ]}
      />
      <PageHeader
        eyebrow={`writing · ${hub.tag}`}
        title={hub.label}
        lede={hub.description}
      />

      {/* Tags repeat on every card here, so they are dropped from the rows and
          the sibling tags are offered once, at the bottom, instead. */}
      <PostList
        posts={hub.posts}
        showTags={false}
        emptyMessage="Nothing tagged this yet."
      />

      <footer className="border-t border-line-soft pt-6">
        <p className="font-mono text-label-sm uppercase text-muted">Other topics</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {others.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/blog/tag/${h.slug}`}
                className="block rounded-sm border border-line bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 transition-colors hover:border-brand-deep hover:text-brand-soft"
              >
                {h.tag}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/blog"
          className="mt-6 inline-block text-sm text-brand-soft hover:underline"
        >
          ← All writing
        </Link>
      </footer>
    </div>
  );
}
