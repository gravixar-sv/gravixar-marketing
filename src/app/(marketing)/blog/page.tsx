import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { PostList } from "@/components/site/PostList";
import { loadBlogPosts } from "@/content/loaders";
import { loadTagHubs } from "@/lib/blog-tags";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = buildMetadata({
  title: "Field Notes on Operations, AI Tooling and Systems",
  description:
    "Notes on operations, AI tooling, and the systems Qamar builds. Some posts drafted by an AI agent, always reviewed before publish.",
  path: "/blog",
});

export default async function BlogIndexPage() {
  const [posts, hubs] = await Promise.all([loadBlogPosts(), loadTagHubs()]);
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="writing"
        title="Notes on the systems I build."
        lede="Some posts I write directly. Some are drafted by the AI SEO agent that runs on this site, and I edit and approve them before they ship, flagged on each post."
      />

      {hubs.length > 0 ? (
        <nav aria-label="Topics">
          <p className="font-mono text-label-sm uppercase text-muted">Topics</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {hubs.map((h) => (
              <li key={h.slug}>
                <Link
                  href={`/blog/tag/${h.slug}`}
                  className="block rounded-sm border border-line bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-400 transition-colors hover:border-brand-deep hover:text-brand-soft"
                >
                  {h.tag}
                  <span className="ml-1.5 text-muted">{h.posts.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <PostList
        posts={posts}
        emptyMessage="No posts published yet. The agent is warming up."
      />
    </div>
  );
}
