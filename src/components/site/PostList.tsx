import Link from "next/link";
import type { Loaded } from "@/content/loaders";
import type { BlogPost } from "@/content/schema";
import { tagSlug } from "@/lib/blog-tags";

// The blog index card, shared with the tag hubs so the two lists cannot drift.
//
// The card used to be one <Link> wrapping everything including the tag chips.
// Now that the chips are themselves links, that shape is invalid: an anchor
// cannot contain an anchor, and browsers recover from it by splitting the
// outer one, which loses the card's own click target on exactly the rows that
// have tags. So the Link wraps the date, title and excerpt, and the chips sit
// beside it as their own list.
export function PostList({
  posts,
  /** Rendered flat on a tag hub, where every card repeats the same chip. */
  showTags = true,
  emptyMessage = "No posts published yet.",
}: {
  posts: Loaded<BlogPost>[];
  showTags?: boolean;
  emptyMessage?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-zinc-950 p-8 text-center">
        <p className="text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-900">
      {posts.map((p) => (
        <li key={p.meta.slug} className="py-6">
          <Link href={`/blog/${p.meta.slug}`} className="group block">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-label-sm uppercase text-muted">
                {p.meta.publishedAt}
              </p>
              {p.meta.aiAssisted ? (
                <p className="font-mono text-label-sm uppercase text-brand-deep">
                  ai-assisted, human-edited
                </p>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100 group-hover:text-brand-soft">
              {p.meta.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.meta.excerpt}</p>
          </Link>
          {showTags && p.meta.tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {p.meta.tags.map((t) => (
                <li key={t}>
                  <Link
                    href={`/blog/tag/${tagSlug(t)}`}
                    className="block rounded-sm border border-line bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 transition-colors hover:border-brand-deep hover:text-brand-soft"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
