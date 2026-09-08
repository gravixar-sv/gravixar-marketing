// Tag hubs for /blog.
//
// Every post already carried tags and rendered them as unlinked chips, so the
// taxonomy the SEO agent is prompted to maintain produced no page, no internal
// link and nothing indexable. This turns it into routes.
//
// THE PART THAT NEEDED A RULE. Tag pages are the classic way to manufacture
// thin, near-duplicate pages, and the tag distribution here is exactly the
// shape that goes wrong: across 12 published posts, `agency-ops` is on 11 and
// `ops-infrastructure` is on 11. A hub for either is not a subset of the blog,
// it is a second copy of it with a different <h1>, competing with /blog for
// the same queries and splitting whatever authority the section has.
//
// So a tag earns a place in the index by being a genuine subset:
//
//   at least MIN_POSTS, because below that the page is thin, and
//   at most MAX_SHARE of the corpus, because above that it is /blog again.
//
// A tag outside those bounds still gets a page. It is useful to a reader
// filtering the list, and dropping the link would leave dead chips on every
// post. It is served `noindex, follow` and kept out of the sitemap: crawlable
// as a path to the posts, not competing as a destination.
//
// The rule is proportional rather than a hardcoded denylist, so it maintains
// itself. If the blog broadens and `agency-ops` falls under the ceiling, it
// starts being indexed on the next build with nobody editing this file.

import { loadBlogPosts, type Loaded } from "@/content/loaders";
import type { BlogPost } from "@/content/schema";

export const TAG_HUB_MIN_POSTS = 3;
export const TAG_HUB_MAX_SHARE = 0.7;

export type TagHub = {
  tag: string;
  slug: string;
  /** Page heading. */
  label: string;
  /** <title>, written per tag rather than derived: deriving it produced
   *  "Client portals: writing on client portals". */
  title: string;
  description: string;
  posts: Loaded<BlogPost>[];
  /** Genuine subset: indexed and listed in the sitemap. */
  indexable: boolean;
};

export const tagSlug = (tag: string) =>
  tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// A hub page whose only content is a list of links the reader could already
// see on /blog is thin whatever the maths above says. These are written by
// hand, one per tag actually in use, so an indexed hub says something /blog
// does not. An unknown tag falls back rather than shipping an empty page.
const TAG_COPY: Record<string, { label: string; title: string; description: string }> = {
  "agency-ops": {
    title: "Agency operations, from intake to handoff",
    label: "Agency operations",
    description:
      "Running an agency's delivery rather than its creative work: intake, approvals, handoffs, and the parts that start breaking as the client count goes up.",
  },
  "ops-infrastructure": {
    title: "Ops infrastructure for small teams",
    label: "Ops infrastructure",
    description:
      "The systems underneath the work. Portals, state machines, audit trails, and what to build once off-the-shelf tools stop fitting the shape of the business.",
  },
  operations: {
    title: "Operations and delivery process",
    label: "Operations",
    description:
      "How work actually moves through a small team, and the process decisions that decide whether it moves cleanly or accumulates scar tissue.",
  },
  "client-portals": {
    title: "Client portals and what they have to do",
    label: "Client portals",
    description:
      "What a client portal has to do beyond giving clients somewhere to log in, and the point at which the cheap ones stop being enough.",
  },
  "ai-governance": {
    title: "AI governance: approval gates and audit trails",
    label: "AI governance",
    description:
      "Approval gates, audit trails and human review on AI output. What has to sit between a model and anything a client will read.",
  },
  "ai-tooling": {
    title: "AI tooling that survives production",
    label: "AI tooling",
    description:
      "Building with AI agents in production: the confidence floor, the exception handling, and the parts that take considerably longer than the demo.",
  },
};

const copyFor = (tag: string) =>
  TAG_COPY[tag] ?? {
    label: tag.replace(/-/g, " "),
    title: tag.replace(/-/g, " "),
    description: `Posts tagged ${tag.replace(/-/g, " ")}.`,
  };

export async function loadTagHubs(): Promise<TagHub[]> {
  const posts = await loadBlogPosts();
  const byTag = new Map<string, Loaded<BlogPost>[]>();

  for (const post of posts) {
    for (const tag of post.meta.tags) {
      const key = tagSlug(tag);
      if (!key) continue;
      const bucket = byTag.get(key);
      if (bucket) bucket.push(post);
      else byTag.set(key, [post]);
    }
  }

  const total = posts.length;
  return [...byTag.entries()]
    .map(([slug, tagged]) => ({
      tag: slug,
      slug,
      ...copyFor(slug),
      posts: tagged,
      indexable:
        tagged.length >= TAG_HUB_MIN_POSTS &&
        total > 0 &&
        tagged.length / total <= TAG_HUB_MAX_SHARE,
    }))
    .sort((a, b) => b.posts.length - a.posts.length || a.slug.localeCompare(b.slug));
}

export async function loadTagHub(slug: string): Promise<TagHub | undefined> {
  const hubs = await loadTagHubs();
  return hubs.find((h) => h.slug === slug);
}
