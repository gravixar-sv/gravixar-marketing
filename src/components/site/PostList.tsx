import Link from "next/link";
import type { Loaded } from "@/content/loaders";
import type { BlogPost } from "@/content/schema";
import { Arrow } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { tagsFor, type TagIndex } from "@/components/content/blog";
import { longDate, readingMinutes } from "@/components/content/longform";
import { cn } from "@/lib/cn";

// The writing index, shared by /blog, the tag hubs and the related-reading
// block under a post, so the three lists cannot drift.
//
// Shape: an optional LEAD (the newest post, set large) and then editorial ROWS
// on a date gutter. Rows are text, so hover never lifts them: the title
// brightens and its underline draws in, and that is all.
//
// The row link wraps the title and excerpt only. The topic links sit beside it
// as their own list, because an anchor cannot contain an anchor (browsers
// split the outer one and the row loses its click target).
//
// There is no "AI-assisted" flag on rows. Every published post carries it, so
// on a list it says nothing; the index lede states it once and each post says
// it under its own title.
//
// Dates read the way the post's own byline reads them ("8 September 2026"),
// in the sans caption. The ISO string stays in dateTime for machines; set in
// mono on the page it was a format the reader had to parse, and it changed
// shape between the list and the post.
export function PostList({
  posts,
  tags,
  lead = false,
  hideTag,
  headingLevel = "h2",
  emptyMessage = "No posts published yet.",
}: {
  posts: Loaded<BlogPost>[];
  /** Human labels for tag slugs. Omit to render rows without topic links. */
  tags?: TagIndex;
  /** Render the first post as the lead. */
  lead?: boolean;
  /** A tag hub drops its own tag from the rows: every row would repeat it. */
  hideTag?: string;
  headingLevel?: "h2" | "h3";
  emptyMessage?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="card-surface rounded-xl p-8">
        <p className="text-ink-400">{emptyMessage}</p>
      </div>
    );
  }

  const [first, ...rest] = posts;
  const rows = lead ? rest : posts;

  return (
    <div>
      {lead && first ? <LeadPost post={first} /> : null}
      {rows.length > 0 ? (
        <Reveal className="reveal-quiet">
          <ol className={cn("reveal-stagger", lead && "mt-16 md:mt-20")}>
            {rows.map((p) => (
              <PostRow
                key={p.meta.slug}
                post={p}
                tags={tags}
                hideTag={hideTag}
                headingLevel={headingLevel}
              />
            ))}
          </ol>
        </Reveal>
      ) : null}
    </div>
  );
}

function LeadPost({ post }: { post: Loaded<BlogPost> }) {
  const minutes = readingMinutes(post.body);
  return (
    <article className="group relative">
      <p className="text-caption text-ink-500">
        <span className="font-medium text-ink-300">Newest</span>
        <span aria-hidden className="mx-2 text-ink-600">·</span>
        <time dateTime={post.meta.publishedAt}>{longDate(post.meta.publishedAt)}</time>
        <span aria-hidden className="mx-2 text-ink-600">·</span>
        {minutes} min read
      </p>
      <h2 className="mt-4 max-w-[26ch] text-section font-semibold text-ink-100 transition-colors group-hover:text-ink-50">
        <Link href={`/blog/${post.meta.slug}`} className="after:absolute after:inset-0">
          <span className="link-draw pb-1">{post.meta.title}</span>
        </Link>
      </h2>
      <p className="mt-5 max-w-[62ch] text-lead text-ink-300">{post.meta.excerpt}</p>
      <p className="mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-100">
        Read the post <Arrow />
      </p>
    </article>
  );
}

function PostRow({
  post,
  tags,
  hideTag,
  headingLevel,
}: {
  post: Loaded<BlogPost>;
  tags?: TagIndex;
  hideTag?: string;
  headingLevel: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const topics = tags
    ? tagsFor(post.meta, tags).filter((t) => !t.common && t.slug !== hideTag)
    : [];
  return (
    <li className="group grid gap-x-10 gap-y-2 border-t border-line-soft py-7 transition-colors hover:border-line md:grid-cols-[8.5rem_minmax(0,1fr)] md:py-8">
      <time
        dateTime={post.meta.publishedAt}
        className="text-caption text-ink-500 md:pt-[0.3rem]"
      >
        {longDate(post.meta.publishedAt)}
      </time>
      <div className="min-w-0">
        <Link href={`/blog/${post.meta.slug}`} className="block">
          <Heading className="max-w-[40rem] text-xl font-semibold leading-snug tracking-[-0.012em] text-ink-100 transition-colors group-hover:text-ink-50">
            <span className="link-draw pb-0.5">{post.meta.title}</span>
          </Heading>
          <p className="mt-2.5 line-clamp-3 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink-400 md:line-clamp-none">
            {post.meta.excerpt}
          </p>
        </Link>
        {topics.length > 0 ? (
          <ul className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-caption text-ink-500 md:flex">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/blog/tag/${t.slug}`}
                  className="transition-colors hover:text-ink-200"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
