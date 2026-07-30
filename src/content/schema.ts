// Content schemas, every MDX frontmatter is validated against one of these
// at build time by scripts/content-validate.ts. Bad frontmatter fails the
// build before deploy.

import { z } from "zod";

export const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const baseImage = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const blogPostSchema = z.object({
  title: z.string().min(3).max(120),
  slug,
  excerpt: z.string().min(20).max(280),
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  tags: z.array(z.string().min(1)).default([]),
  cover: baseImage.optional(),
  draft: z.boolean().default(false),
  // explicit AI-disclosure flag, surfaced on the post itself
  aiAssisted: z.boolean().default(false),
});
export type BlogPost = z.infer<typeof blogPostSchema>;

export const caseStudySchema = z.object({
  title: z.string().min(3).max(120),
  slug,
  client: z.string().min(1),
  role: z.string().min(1),
  period: z.string().min(1), // free-form e.g. "Jan 2025 – present"
  summary: z.string().min(20).max(320),
  problem: z.string().min(1),
  approach: z.string().min(1),
  outcome: z.string().min(1),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  stack: z.array(z.string().min(1)).default([]),
  cover: baseImage,
  publishedAt: isoDate,
  draft: z.boolean().default(false),
});
export type CaseStudy = z.infer<typeof caseStudySchema>;

export const serviceBucket = z.enum(["operations", "ai", "brand", "audit"]);

export const serviceSchema = z.object({
  title: z.string().min(3).max(80),
  slug,
  bucket: serviceBucket,
  // Which tier of engagement this is. Three of them, because they are
  // genuinely different commitments, not three labels for one thing:
  //   build   = scoped work with an end date, delivered and handed over
  //   ongoing = a retainer where I am the one making the calls, AI ops or audit
  //   maintain = a managed retainer, someone else's stack kept running
  // Drives layout: the service grids are 12 columns and each card spans
  // 12 / (services in its own track), so a row always fills exactly and never
  // leaves an orphan. The span comes from what a service IS, not from its
  // index in an array, so adding a sixth service can't silently break a grid.
  track: z.enum(["build", "ongoing", "maintain"]).default("build"),
  tagline: z.string().min(20).max(200),
  deliverables: z.array(z.string().min(1)).min(1),
  // links to live proof, case studies, live demos, public artifacts
  proof: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1),
        kind: z.enum(["case-study", "live-demo", "external"]),
      }),
    )
    .default([]),
  pricing: z.string().optional(), // free-form, "From $X" or "Project-based"
  order: z.number().int().nonnegative().default(0),
  // ISO date, e.g. "2026-07-30". When the scope of this offer last moved,
  // not when the page copy was tweaked. Optional: a service that has never
  // changed shape doesn't need one.
  updatedAt: isoDate.optional(),
});
export type Service = z.infer<typeof serviceSchema>;

export const graphicsKind = z.enum(["static", "motion", "brand"]);

export const graphicsItemSchema = z.object({
  title: z.string().min(2).max(120),
  slug,
  kind: graphicsKind,
  year: z.number().int().min(2000).max(2100),
  tools: z.array(z.string().min(1)).default([]),
  cover: baseImage,
  gallery: z.array(baseImage).default([]),
  video: z
    .object({ src: z.string().min(1), poster: z.string().optional() })
    .optional(),
  processNote: z.string().optional(),
  order: z.number().int().nonnegative().default(0),
});
export type GraphicsItem = z.infer<typeof graphicsItemSchema>;

export const homeBlockSchema = z.object({
  title: z.string().min(1),
  // optional callout/eyebrow text, short
  eyebrow: z.string().max(80).optional(),
});
export type HomeBlock = z.infer<typeof homeBlockSchema>;

export const pageSchema = z.object({
  title: z.string().min(1).max(120),
  eyebrow: z.string().max(80).optional(),
  description: z.string().min(20).max(280).optional(),
});
export type Page = z.infer<typeof pageSchema>;

// Comparison pages: "Productive.io vs custom", "Karbon vs custom", etc.
// Bottom-funnel commercial intent, survives AI Overview displacement
// because the search is vendor-comparison, not informational.
// Each page renders an FAQPage block for AI-citation lift.
export const compareSchema = z.object({
  title: z.string().min(3).max(140),
  slug,
  competitor: z.string().min(1).max(80),
  competitorUrl: z.string().url().optional(),
  category: z.string().min(1).max(80), // "agency PM", "accounting workflow", "video-team storage"
  summary: z.string().min(20).max(320),
  hook: z.string().min(10).max(240), // the one named opinion the AI Overview can't summarize away
  whoForCompetitor: z.string().min(10), // "pick the off-the-shelf tool when..."
  whoForCustom: z.string().min(10), // "go custom when..."
  linkedCaseStudy: slug.optional(),
  linkedService: slug.optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(5).max(200),
        answer: z.string().min(20),
      }),
    )
    .min(3)
    .max(8),
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  draft: z.boolean().default(false),
});
export type Compare = z.infer<typeof compareSchema>;

// Module library entries: each describes a reusable production-tested
// pattern (auth, audit log, review state machine, AI guardrail, etc.)
// that ships across multiple Gravixar builds. The /modules page makes
// the productization narrative visible. Frontmatter is intentionally
// minimal; the MDX body carries the substance.
export const moduleCategory = z.enum([
  "auth",
  "audit",
  "ai",
  "finance",
  "ops",
  "comms",
]);

export const moduleSchema = z.object({
  title: z.string().min(3).max(80),
  slug,
  category: moduleCategory,
  summary: z.string().min(20).max(280),
  // Where this module is running today, with linked product slug.
  runningIn: z
    .array(
      z.object({
        client: z.string().min(1),
        productSlug: slug.optional(),
      }),
    )
    .min(1),
  stack: z.array(z.string().min(1)).default([]),
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  order: z.number().int().nonnegative().default(0),
  draft: z.boolean().default(false),
});
export type Module = z.infer<typeof moduleSchema>;

// content/data/system-stats.json: the counters the homepage puts in front of
// a visitor. Every number carries the provenance that produced it and the date
// it was last recounted, so a stat can't drift without the drift being visible.
// Not an MDX section, so scripts/content-validate.ts validates this file with
// its own step and fails the build once a verifiedAt goes stale.
export const systemStatSchema = z.object({
  key: slug,
  label: z.string().min(1).max(60),
  // string, not number: some stats are composite ("9 / 5")
  value: z.string().min(1).max(24),
  // names where the number came from, in words, e.g.
  // "brain/_meta/module-health.json summary.total"
  source: z.string().min(10),
  verifiedAt: isoDate,
});
export type SystemStat = z.infer<typeof systemStatSchema>;

export const systemStatsSchema = z.object({
  stats: z.array(systemStatSchema).min(1),
});
export type SystemStats = z.infer<typeof systemStatsSchema>;

export const SCHEMAS = {
  blog: blogPostSchema,
  "case-studies": caseStudySchema,
  services: serviceSchema,
  graphics: graphicsItemSchema,
  home: homeBlockSchema,
  pages: pageSchema,
  compare: compareSchema,
  modules: moduleSchema,
} as const;

export type ContentKind = keyof typeof SCHEMAS;
