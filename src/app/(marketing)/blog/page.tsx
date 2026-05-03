import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { loadBlogPosts } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = buildMetadata({
  title: "Writing",
  description:
    "Notes on operations, AI tooling, and the systems Qamar builds. Some posts drafted by an AI agent, always reviewed before publish.",
  path: "/blog",
});

export default async function BlogIndexPage() {
  const posts = await loadBlogPosts();
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="writing"
        title="Notes on the systems I build."
        lede="Some posts I write directly. Some are drafted by the AI SEO agent that runs on this site, and I edit and approve them before they ship, flagged on each post."
      />

      {posts.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-zinc-400">No posts published yet. The agent is warming up.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {posts.map((p) => (
            <li key={p.meta.slug}>
              <Link
                href={`/blog/${p.meta.slug}`}
                className="group block py-6 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {p.meta.publishedAt}
                  </p>
                  {p.meta.aiAssisted ? (
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand-deep">
                      ai-assisted, human-edited
                    </p>
                  ) : null}
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100 group-hover:text-brand-soft">
                  {p.meta.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.meta.excerpt}</p>
                {p.meta.tags.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {p.meta.tags.map((t) => (
                      <li
                        key={t}
                        className="rounded-sm border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
