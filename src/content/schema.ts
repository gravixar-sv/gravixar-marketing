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

export const serviceBucket = z.enum(["operations", "ai", "brand"]);

export const serviceSchema = z.object({
  title: z.string().min(3).max(80),
  slug,
  bucket: serviceBucket,
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

export const SCHEMAS = {
  blog: blogPostSchema,
  "case-studies": caseStudySchema,
  services: serviceSchema,
  graphics: graphicsItemSchema,
  home: homeBlockSchema,
  pages: pageSchema,
} as const;

export type ContentKind = keyof typeof SCHEMAS;
