import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDX } from "@/content/mdx";
import { PageHeader } from "@/components/site/PageHeader";
import { PostList } from "@/components/site/PostList";
import { ContactCTA } from "@/components/home/ContactCTA";
import { StructuredDataBlogPost, StructuredDataBreadcrumb } from "@/components/site/StructuredData";
import { ArticleBody } from "@/components/content/ArticleBody";
import { AuthorNote } from "@/components/content/AuthorNote";
import { relatedPosts, tagIndex, tagsFor } from "@/components/content/blog";
import { extractToc, longDate, readingMinutes } from "@/components/content/longform";
import { loadBlogPosts } from "@/content/loaders";
import { loadTagHubs } from "@/lib/blog-tags";
import { buildMetadata, SITE } from "@/lib/seo";

export const revalidate = 1800;

export async function generateStaticParams() {
  const posts = await loadBlogPosts();
  return posts.map((p) => ({ slug: p.meta.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const posts = await loadBlogPosts();
  const post = posts.find((p) => p.meta.slug === slug);
  if (!post) return { title: "Not found" };
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.metaDescription ?? post.meta.excerpt,
    path: `/blog/${slug}`,
    ogImage: post.meta.cover?.src,
    ogType: "article",
    publishedTime: post.meta.publishedAt,
    modifiedTime: post.meta.updatedAt ?? post.meta.publishedAt,
  });
}

// A post is the site's main search landing page, so it is laid out to be read
// and then to lead somewhere: header, a 68ch column with a contents rail, and a
// footer with the author, related reading and the next step. It used to end on
// a single "All writing" link.
export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [posts, hubs] = await Promise.all([loadBlogPosts(), loadTagHubs()]);
  const post = posts.find((p) => p.meta.slug === slug);
  if (!post) notFound();

  const toc = extractToc(post.body);
  const minutes = readingMinutes(post.body);
  const tags = tagIndex(hubs, posts.length);
  const related = relatedPosts(post, posts, 3);
  const updated =
    post.meta.updatedAt && post.meta.updatedAt !== post.meta.publishedAt
      ? post.meta.updatedAt
      : null;

  return (
    <div>
      <StructuredDataBlogPost
        title={post.meta.title}
        description={post.meta.excerpt}
        url={`${SITE.url}/blog/${slug}`}
        publishedAt={post.meta.publishedAt}
        updatedAt={post.meta.updatedAt}
        author={SITE.author}
        // Falls back to the same /api/og card the page's own og:image points
        // at, so `image` is never empty even for a post with no cover.
        image={
          post.meta.cover?.src ??
          `/api/og?title=${encodeURIComponent(post.meta.title)}`
        }
      />
      <StructuredDataBreadcrumb
        items={[
          { name: "Home", url: SITE.url },
          { name: "Writing", url: `${SITE.url}/blog` },
          { name: post.meta.title, url: `${SITE.url}/blog/${slug}` },
        ]}
      />

      {/* .read-track feeds the header's reading-progress line. It wraps the
          header and body only, so the line completes at the last paragraph,
          not at the footer. */}
      <article className="read-track">
        <PageHeader
          eyebrow="Writing"
          eyebrowHref="/blog"
          title={post.meta.title}
          lede={post.meta.excerpt}
        >
          <div className="space-y-1 text-caption text-ink-500">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-ink-300">{SITE.author}</span>
              <Dot />
              <time dateTime={post.meta.publishedAt}>{longDate(post.meta.publishedAt)}</time>
              {updated ? (
                <>
                  <Dot />
                  <span>
                    Updated <time dateTime={updated}>{longDate(updated)}</time>
                  </span>
                </>
              ) : null}
              <Dot />
              <span>{minutes} min read</span>
            </p>
            {/* Its own line, so the disclosure never wraps into a trailing dot
                and never reads as a footnote to the reading time. */}
            {post.meta.aiAssisted ? <p>AI-assisted, human-edited</p> : null}
          </div>
        </PageHeader>

        <ArticleBody toc={toc} className="mt-12 md:mt-16">
          <MDX source={post.body} />
        </ArticleBody>
      </article>

      <footer className="mt-20 space-y-20 md:mt-28 md:space-y-24">
        {/* Common topics (on most posts) are dropped here as they are on the
            list rows and the topics row: they tell this post apart from
            nothing, and the row would never have offered them. */}
        <AuthorNote
          name={SITE.author}
          aiAssisted={post.meta.aiAssisted}
          topics={tagsFor(post.meta, tags).filter((t) => !t.common)}
        />

        {related.length > 0 ? (
          <section aria-labelledby="keep-reading">
            <h2 id="keep-reading" className="text-subsection font-semibold text-ink-50">
              Keep reading
            </h2>
            <div className="mt-6">
              <PostList posts={related} tags={tags} headingLevel="h3" />
            </div>
          </section>
        ) : null}

        {/* The compact close: AuthorNote already shows Qamar, and a long
            read ends better on a quiet ask than on a second lit panel. */}
        <ContactCTA compact />
      </footer>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-ink-600">
      ·
    </span>
  );
}
