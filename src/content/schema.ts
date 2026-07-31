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

// What kind of artefact the piece is. The old trio was
// ["static", "motion", "brand"], which asked a reader to act on the
// difference between "static" and "brand" (there isn't one, a brand system
// is mostly static) while having nowhere to put a shipped web surface or a
// print deck. These five name the medium instead, so the filter on /graphics
// sorts by something a buyer is actually shopping for.
export const graphicsKind = z.enum([
  "identity",
  "interface",
  "motion",
  "web",
  "print",
]);

// Who the work was for. This is the field that lets /graphics be a capability
// showcase rather than a client-work portfolio: a portfolio implies "a client
// hired me for this", which own-brand work cannot claim honestly, and that
// implied claim is why the first attempt at populating this page was reverted.
// Declaring provenance instead makes the honest claim, "I can build this, and
// here it is built".
//   client        = commissioned, a client paid for it and cleared it to show
//   self-directed = my own brand or product, built to my own brief
//   concept       = unbuilt or exploratory, no shipping client behind it
export const graphicsOrigin = z.enum(["client", "self-directed", "concept"]);

export const graphicsItemSchema = z.object({
  title: z.string().min(2).max(120),
  slug,
  kind: graphicsKind,
  // Required, and deliberately NOT defaulted. A default would let an
  // unlabeled entry render with a provenance it never declared, which is
  // exactly the failure this field exists to prevent: silence would read as
  // "client" to anyone scanning a gallery. Making it required means the
  // build stops until a human says what the piece is. Same instinct as
  // aiAssisted on blogPostSchema, volunteered rather than buried.
  origin: graphicsOrigin,
  year: z.number().int().min(2000).max(2100),
  // One line for the index card. Required because a card with a title and an
  // image and no sentence makes the reader open the piece to learn whether
  // it is worth opening.
  summary: z.string().min(20).max(280),
  tools: z.array(z.string().min(1)).default([]),
  cover: baseImage,
  gallery: z.array(baseImage).default([]),
  // CSP CONSTRAINT, read before adding a video. next.config.ts declares
  // img-src (which includes the Vercel Blob host) but no media-src, so media
  // falls back to default-src 'self'. A blob-hosted or otherwise off-origin
  // video parses here, passes prebuild and ships green, then gets blocked at
  // runtime with nothing in the build log to explain it. Same-origin files
  // under public/ are covered by 'self'. Anything else needs a media-src
  // directive added in the same change as the video, not after it.
  video: z
    .object({ src: z.string().min(1), poster: z.string().optional() })
    .optional(),
  // The index card's moving cover, and a different thing from `video` above.
  // `video` is the lead media on the detail route: full size, with controls,
  // the reader presses play. `preview` is a short muted loop that starts
  // itself when the card scrolls into view and stops when it leaves, so a
  // piece whose whole subject is motion can show the motion in the gallery
  // instead of describing it under a still.
  // Same CSP constraint as `video`, and it binds harder here because nothing
  // on the card asks the reader to click: both files must sit under public/,
  // where default-src 'self' covers them. An off-origin src would parse, pass
  // prebuild and ship green, then leave a dead card at runtime.
  // poster is required, not optional as it is on `video`: the poster is what
  // the server renders and the only frame a reader gets with scripting off or
  // reduced motion asked for, so an entry without one would have a blank cell
  // on exactly the paths that matter most.
  preview: z
    .object({ src: z.string().min(1), poster: z.string().min(1) })
    .optional(),
  processNote: z.string().optional(),
  // Drives a wider cell in the /graphics grid. A property of the piece, not
  // of its position in an array, so the grid can't silently reflow when an
  // entry is added above it.
  featured: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
  // Staged but not public. Filtered by loadGraphics, so a piece can sit in
  // content/graphics/ while the copy is still being written, without the
  // _drafts/ path trick.
  draft: z.boolean().default(false),
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
  // Required, not optional. It is the page lede AND the meta description, and
  // the routes now read it instead of restating it. Optional meant a page
  // could ship with no meta description at all, or with a hardcoded copy in
  // the route that drifted from the frontmatter, which is exactly what had
  // happened on /privacy. Both existing pages already carry one.
  description: z.string().min(20).max(280),
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
