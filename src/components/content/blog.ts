import type { Loaded } from "@/content/loaders";
import type { BlogPost } from "@/content/schema";
import { TAG_HUB_MAX_SHARE, tagSlug, type TagHub } from "@/lib/blog-tags";

// What a tag chip needs to render as a person reads it: the hub's hand-written
// label ("Agency operations"), not the slug ("agency-ops").
//
// `common` marks a tag that sits on most of the corpus (the same share rule
// that keeps a hub out of the index). On a row it says nothing, since nearly
// every row would print it, so rows skip common tags and show only the ones
// that tell this post apart.
export type TagInfo = { slug: string; label: string; count: number; common: boolean };
export type TagIndex = Record<string, TagInfo>;

export function tagIndex(hubs: TagHub[], total: number): TagIndex {
  const out: TagIndex = {};
  for (const h of hubs) {
    out[h.slug] = {
      slug: h.slug,
      label: h.label,
      count: h.posts.length,
      common: total > 0 && h.posts.length / total > TAG_HUB_MAX_SHARE,
    };
  }
  return out;
}

export function tagsFor(post: BlogPost, index: TagIndex): TagInfo[] {
  const seen = new Set<string>();
  const out: TagInfo[] = [];
  for (const t of post.tags) {
    const slug = tagSlug(t);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(index[slug] ?? { slug, label: t.replace(/-/g, " "), count: 1, common: false });
  }
  return out;
}

// Related reading by shared tags, weighted so a rare shared tag counts for more
// than one that is on every post (inverse frequency). Ties go to the newer
// post. Only posts that share something distinctive qualify; if that leaves
// fewer than two, the newest others fill in so the footer is never a dead end.
export function relatedPosts(
  post: Loaded<BlogPost>,
  all: Loaded<BlogPost>[],
  limit = 3,
): Loaded<BlogPost>[] {
  const others = all.filter((p) => p.meta.slug !== post.meta.slug);
  const freq = new Map<string, number>();
  for (const p of all) {
    for (const t of new Set(p.meta.tags.map(tagSlug))) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const mine = new Set(post.meta.tags.map(tagSlug));
  const total = all.length || 1;
  const scored = others
    .map((p) => {
      let score = 0;
      for (const t of new Set(p.meta.tags.map(tagSlug))) {
        if (mine.has(t)) score += Math.log(total / (freq.get(t) ?? total));
      }
      return { p, score };
    })
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score || b.p.meta.publishedAt.localeCompare(a.p.meta.publishedAt))
    .map((s) => s.p);

  const picked = scored.slice(0, limit);
  if (picked.length < 2) {
    for (const p of others) {
      if (picked.length >= Math.min(limit, 2)) break;
      if (!picked.includes(p)) picked.push(p);
    }
  }
  return picked;
}
