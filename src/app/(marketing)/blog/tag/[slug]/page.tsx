import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { PostList } from "@/components/site/PostList";
import { ContactCTA } from "@/components/home/ContactCTA";
import { StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { TopicNav } from "@/components/content/TopicNav";
import { tagIndex } from "@/components/content/blog";
import { loadBlogPosts } from "@/content/loaders";
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

// Same shape as /blog on purpose: the topics row with this hub current, a lead,
// then rows. The "Other topics" footer that used to close this page is gone,
// because the topics row at the top already offers every sibling.
export default async function BlogTagPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [hub, hubs, posts] = await Promise.all([
    loadTagHub(slug),
    loadTagHubs(),
    loadBlogPosts(),
  ]);
  if (!hub) notFound();

  return (
    <div>
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Writing", url: `${SITE.url}/blog` },
          { name: hub.label, url: `${SITE.url}/blog/tag/${hub.slug}` },
        ]}
      />
      <PageHeader
        eyebrow="Writing"
        eyebrowHref="/blog"
        title={hub.label}
        lede={hub.description}
      >
        <TopicNav hubs={hubs} total={posts.length} current={hub.slug} />
      </PageHeader>

      <div className="mt-12 md:mt-16">
        <PostList
          posts={hub.posts}
          tags={tagIndex(hubs, posts.length)}
          hideTag={hub.slug}
          lead={hub.posts.length > 2}
          emptyMessage="Nothing filed under this topic yet."
        />
      </div>

      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}
