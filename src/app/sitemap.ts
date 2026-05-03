import type { MetadataRoute } from "next";
import {
  loadBlogPosts,
  loadCaseStudies,
  loadGraphics,
  loadServices,
} from "@/content/loaders";
import { SITE } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts, studies, graphics] = await Promise.all([
    loadServices(),
    loadBlogPosts(),
    loadCaseStudies(),
    loadGraphics(),
  ]);

  const url = (path: string) => `${SITE.url}${path}`;
  const staticRoutes = ["/", "/about", "/services", "/work", "/blog", "/graphics", "/contact"];

  return [
    ...staticRoutes.map((p) => ({ url: url(p), lastModified: new Date() })),
    ...services.map((s) => ({ url: url(`/services/${s.meta.slug}`), lastModified: new Date() })),
    ...studies.map((s) => ({
      url: url(`/work/${s.meta.slug}`),
      lastModified: new Date(s.meta.publishedAt),
    })),
    ...posts.map((p) => ({
      url: url(`/blog/${p.meta.slug}`),
      lastModified: new Date(p.meta.publishedAt),
    })),
    ...graphics.map((g) => ({ url: url(`/graphics/${g.meta.slug}`), lastModified: new Date() })),
  ];
}
