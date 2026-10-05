import type { MetadataRoute } from "next";
import {
  loadBlogPosts,
  loadBuyerPages,
  loadCaseStudies,
  loadCompares,
  loadGraphics,
  loadModules,
  loadServices,
} from "@/content/loaders";
import { SITE } from "@/lib/seo";
import { loadTagHubs } from "@/lib/blog-tags";
import { getCareersRoles } from "@/lib/careers";

// lastmod is a claim that the page changed on that date, and Google only uses
// it from a sitemap where it is consistently and verifiably accurate. Until
// 2026-10-04 the 13 fixed routes, every graphics piece and any service or role
// without a date were stamped `new Date()`, so every deploy told Google that
// at least 15 URLs had all changed that minute, and the real dates beside them
// were worth less. Now a URL carries a date only when the content holds one:
// an index carries its newest child's date, and a page with no date in its
// content carries none (an absent lastmod is honest, a wrong one is not).

/** The newest of a set of YYYY-MM-DD strings, or undefined if there are none. */
function newest(dates: (string | undefined)[]): Date | undefined {
  const last = dates.filter((d): d is string => Boolean(d)).sort().at(-1);
  return last ? new Date(last) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts, studies, graphics, compares, modules, careers, tagHubs, buyers] =
    await Promise.all([
      loadServices(),
      loadBlogPosts(),
      loadCaseStudies(),
      loadGraphics(),
      loadCompares(),
      loadModules(),
      getCareersRoles(),
      loadTagHubs(),
      loadBuyerPages(),
    ]);

  const url = (path: string) => `${SITE.url}${path}`;
  const postDate = (p: (typeof posts)[number]) => p.meta.updatedAt ?? p.meta.publishedAt;
  const compareDate = (c: (typeof compares)[number]) => c.meta.updatedAt ?? c.meta.publishedAt;
  const moduleDate = (m: (typeof modules)[number]) => m.meta.updatedAt ?? m.meta.publishedAt;

  // Index pages list their children, so they changed when the newest child did.
  // The rest of the fixed routes have no date anywhere in the content.
  const staticRoutes: { path: string; lastModified?: Date }[] = [
    { path: "/" },
    { path: "/about" },
    { path: "/services", lastModified: newest(services.map((s) => s.meta.updatedAt)) },
    { path: "/modules", lastModified: newest(modules.map(moduleDate)) },
    { path: "/work", lastModified: newest(studies.map((s) => s.meta.publishedAt)) },
    { path: "/demos" },
    { path: "/careers", lastModified: newest(careers.map((r) => r.publishedAt)) },
    { path: "/blog", lastModified: newest(posts.map(postDate)) },
    { path: "/graphics" },
    { path: "/compare", lastModified: newest(compares.map(compareDate)) },
    { path: "/contact" },
    { path: "/early-access" },
    { path: "/privacy" },
  ];

  // `lastModified` is spread only when known, so an entry without a date emits
  // no <lastmod> rather than an empty or invented one.
  const entry = (path: string, lastModified?: Date) => ({
    url: url(path),
    ...(lastModified ? { lastModified } : {}),
  });

  return [
    ...staticRoutes.map((r) => entry(r.path, r.lastModified)),
    ...services.map((s) => entry(`/services/${s.meta.slug}`, newest([s.meta.updatedAt]))),
    // Buyer pages carry a required updatedAt, so each one's date is its own.
    ...buyers.map((b) => entry(`/for/${b.meta.slug}`, new Date(b.meta.updatedAt))),
    ...studies.map((s) => entry(`/work/${s.meta.slug}`, new Date(s.meta.publishedAt))),
    ...posts.map((p) => entry(`/blog/${p.meta.slug}`, new Date(postDate(p)))),
    // Only the hubs that are a genuine subset of the blog. The rest are served
    // noindex, and listing a noindex URL here asks a crawler to fetch a page
    // in order to be told not to keep it. lastModified is the newest post in
    // the tag, which is the only thing about a hub that actually changes.
    ...tagHubs
      .filter((h) => h.indexable)
      .map((h) => entry(`/blog/tag/${h.slug}`, newest(h.posts.map(postDate)))),
    // Graphics pieces carry no date in their frontmatter, so none is claimed.
    ...graphics.map((g) => entry(`/graphics/${g.meta.slug}`)),
    ...compares.map((c) => entry(`/compare/${c.meta.slug}`, new Date(compareDate(c)))),
    ...modules.map((m) => entry(`/modules/${m.meta.slug}`, new Date(moduleDate(m)))),
    ...careers.map((r) => entry(`/careers/${r.slug}`, newest([r.publishedAt]))),
  ];
}
