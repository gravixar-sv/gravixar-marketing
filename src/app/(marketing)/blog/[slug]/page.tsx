import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDX } from "@/content/mdx";
import { loadBlogPosts } from "@/content/loaders";
import { buildMetadata } from "@/lib/seo";

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
    description: post.meta.excerpt,
    path: `/blog/${slug}`,
    ogImage: post.meta.cover?.src,
  });
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const posts = await loadBlogPosts();
  const post = posts.find((p) => p.meta.slug === slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-900 pb-8">
        <div className="flex items-baseline gap-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            {post.meta.publishedAt}
          </p>
          {post.meta.aiAssisted ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-deep">
              ai-assisted, human-edited
            </p>
          ) : null}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          {post.meta.title}
        </h1>
        <p className="mt-3 text-zinc-400">{post.meta.excerpt}</p>
        {post.meta.tags.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-1.5">
            {post.meta.tags.map((t) => (
              <li
                key={t}
                className="rounded-sm border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
              >
                {t}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="prose-invert mt-8">
        <MDX source={post.body} />
      </div>

      <footer className="mt-16 border-t border-zinc-900 pt-6">
        <Link href="/blog" className="text-sm text-brand-soft hover:underline">
          ← All writing
        </Link>
      </footer>
    </article>
  );
}
