import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { PostList } from "@/components/site/PostList";
import { ContactCTA } from "@/components/home/ContactCTA";
import { TopicNav } from "@/components/content/TopicNav";
import { tagIndex } from "@/components/content/blog";
import { loadBlogPosts } from "@/content/loaders";
import { loadTagHubs } from "@/lib/blog-tags";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = buildMetadata({
  title: "Field notes on operations, AI tooling and systems",
  description:
    "Notes on operations, AI tooling, and the systems Qamar builds. An AI agent drafts the posts, and Qamar edits and approves every one before it goes live.",
  path: "/blog",
});

export default async function BlogIndexPage() {
  const [posts, hubs] = await Promise.all([loadBlogPosts(), loadTagHubs()]);
  // The disclosure is computed, not asserted. Today every published post is an
  // AI draft, and "some posts I write directly" was false for all of them; if
  // a hand-written post ships, the sentence softens to "most" by itself.
  const allAi = posts.length > 0 && posts.every((p) => p.meta.aiAssisted);
  return (
    <div>
      <PageHeader
        eyebrow="Writing"
        title="Notes on the systems I build."
        lede={`An AI agent on this site drafts ${allAi ? "these posts" : "most of these posts"}. I edit and approve every one before it goes live, and each post says so under its byline.`}
      >
        {hubs.length > 0 ? <TopicNav hubs={hubs} total={posts.length} /> : null}
      </PageHeader>

      <div className="mt-12 md:mt-16">
        <PostList
          posts={posts}
          tags={tagIndex(hubs, posts.length)}
          lead
          emptyMessage="No posts published yet."
        />
      </div>

      {/* Every other list page closes on the next step; the writing index
          used to run out on its last row and drop into the footer. */}
      <div className="mt-20 md:mt-28">
        <ContactCTA />
      </div>
    </div>
  );
}
