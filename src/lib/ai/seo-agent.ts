// Core SEO-draft generator. Used by both the production cron route and
// the local script. Returns structured frontmatter + MDX body that the
// caller serializes to disk (locally) or to Vercel Blob (in prod).
//
// Generates through the direct Anthropic provider via the AI SDK. The
// model is centralised in lib/ai/provider.ts so call sites stay clean.
//
// THE RULES THIS FILE TEACHES, added 2026-09-08. The site enforces three
// content rules that this generator, which writes the content, was never
// told about. scripts/content-validate.ts skips `_drafts/`, so nothing
// caught it: the two drafts sitting in the folder on the day this was
// written carried 8 em-dashes and 0 internal links between them, and one
// claimed a platform had been stable for "fourteen months" while its own
// case study on this domain published "live in production since June 2026".
// Every draft therefore cost a rewrite before it could ship, which is the
// real reason the publish queue stopped moving.
//
// The gates were real. Their edges were arbitrary. A rule enforced on the
// output surface and unenforced on the machine that produces the output is
// a rule the human pays for, once per draft, forever.

import { generateObject } from "ai";
import { z } from "zod";
import { contentModel } from "@/lib/ai/provider";
import {
  loadBlogPosts,
  loadCaseStudies,
  loadCompares,
  loadModules,
  loadServices,
} from "@/content/loaders";

export const draftSchema = z.object({
  title: z
    .string()
    .min(20)
    .max(110)
    .describe("Concrete, specific. No vague pitches. No question titles."),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(8)
    .max(80)
    .describe("kebab-case, derived from title"),
  excerpt: z
    .string()
    .min(60)
    .max(280)
    .describe("One- or two-sentence pull quote. No clickbait."),
  // The bounds are blogPostSchema's, not a guess: 70-160 is what the content
  // schema accepts, so a draft that satisfies this satisfies the build.
  //
  // Absent until 2026-09-08, which meant the SEO agent shipped posts with no
  // meta description at all. buildMetadata then fell through to `excerpt`,
  // capped at 280, and a search result got a sentence written to be a pull
  // quote, truncated mid-clause. Every published post has one; every
  // generated draft did not.
  metaDescription: z
    .string()
    .min(70)
    .max(160)
    .describe(
      "Search-result description. A COMPRESSION of what the post already says: it may not introduce a claim the body does not make. 70-160 characters.",
    ),
  tags: z
    .array(z.string().min(2).max(28))
    .min(1)
    .max(5)
    .describe("Lowercase, kebab-case if multi-word."),
  body: z
    .string()
    .min(900)
    .describe(
      "MDX body, ~600-1100 words. Use ## headings. Avoid emoji. Avoid hedging filler. No em-dashes. Two to three inline links to the site's own pages.",
    ),
});

export type Draft = z.infer<typeof draftSchema>;

export type LinkTarget = { href: string; title: string };

export type DraftContext = {
  recentTitles: string[];
  knownTags: string[];
  linkTargets: LinkTarget[];
  engagementFacts: string[];
};

// Everything the prompt needs about the site, read from the site.
//
// Both callers used to derive recentTitles + knownTags themselves, the same
// eight lines twice. Adding two more context sources would have made it the
// same fourteen lines twice, so it moved here instead.
export async function collectDraftContext(): Promise<DraftContext> {
  const [posts, services, compares, modules, studies] = await Promise.all([
    loadBlogPosts({ includeDrafts: true }),
    loadServices(),
    loadCompares(),
    loadModules(),
    loadCaseStudies(),
  ]);

  const linkTargets: LinkTarget[] = [
    ...services.map((s) => ({ href: `/services/${s.meta.slug}`, title: s.meta.title })),
    ...compares.map((c) => ({ href: `/compare/${c.meta.slug}`, title: c.meta.title })),
    ...studies.map((s) => ({ href: `/work/${s.meta.slug}`, title: s.meta.title })),
    ...modules.map((m) => ({ href: `/modules/${m.meta.slug}`, title: m.meta.title })),
    ...posts
      .filter((p) => !p.meta.draft)
      .map((p) => ({ href: `/blog/${p.meta.slug}`, title: p.meta.title })),
  ];

  // The engagements, quoted from the case studies rather than from memory.
  //
  // The old prompt hardcoded "an agency portal he's run for 4 years, a
  // healthcare credentialing platform live in production". A hardcoded
  // duration in a prompt is a number nobody recounts: it was written once
  // and would have aged silently into a false claim, and it is where the
  // "four years of incident logs since 2021" draft got its premise. Reading
  // `period` off the published case study means the prompt says whatever the
  // site says, and stops saying it the day the site stops.
  const engagementFacts = studies.map(
    (s) => `${s.meta.client}: ${s.meta.period} (published at /work/${s.meta.slug})`,
  );

  return {
    recentTitles: posts.slice(0, 10).map((p) => p.meta.title),
    knownTags: Array.from(new Set(posts.flatMap((p) => p.meta.tags))),
    linkTargets,
    engagementFacts,
  };
}

const VOICE = `
You are the AI SEO agent for gravixar.com, Qamar's personal brand site.
Qamar runs an operations consultancy. He builds working systems
(client portals, hiring tools, AI integrations) and refuses to ship slides.

Voice rules, non-negotiable:
- Concrete-and-honest. Name specific tools, specific decisions, specific trade-offs.
- No marketing fluff. No "in today's fast-paced world." No "leverage" used as a verb.
- Refuse hedging. If you're not sure, say so. Don't pad with "could potentially."
- First-person singular ("I"). This is Qamar's writing, never "we" or "our team."
- One opinion per post. The reader should know what Qamar thinks by the end.
- Short paragraphs. Active voice. Cut adverbs.

NEVER USE AN EM-DASH: the long dash, Unicode U+2014, the one HTML writes as
&mdash;. It is banned site-wide because it is an LLM tell, and a build check
rejects it, so a draft containing one cannot ship until a human removes it.
Use a comma, a period, or a colon. A colon carries the "here comes the
payoff" beat an em-dash was reaching for. En dashes and hyphens are fine.

NUMBERS MUST BE REAL. This site publishes a provenance contract: every figure
on it carries a source and a date it was last verified. Blog prose is not
exempt just because a schema cannot check it.
- Use a number only if it is given to you below, in the topic seed, or in a
  page you are linking to. You have no other source. You cannot recall one.
- Never invent a count, a percentage, a duration, or a date to make a point
  land. "Roughly 340 entries", "about 60% of them", "stable for fourteen
  months" are the failure mode: plausible, specific, unverifiable, false.
- The mechanism is the interesting part and it does not need a figure. Write
  "most of them traced back to a communication gap" rather than inventing the
  percentage. A described pattern is honest; a fabricated statistic is not.
- Never contradict the engagement facts listed below. They are quoted from
  the case studies published on this same domain, and a reader can open both.

LINK TO THE SITE, two or three times per post, inline in the prose where the
sentence genuinely earns it. Pick from the target list below and use the exact
href given: a link to a path that does not exist is a broken page, and an
invented one will not be caught before publish. Markdown form, [like this](/services/system-audit).
Never link the same page twice in one post. Never stack them into a "further
reading" list at the end; they belong in the sentence that raised the subject.

What Qamar actually writes about:
- Operations infrastructure for small teams (project portals, delivery governance)
- AI agents and integrations, with strong skepticism toward auto-publish patterns
- The trade-offs in shipping early vs. polishing
- The specific bugs and decisions in his current projects. Refer to them
  generically, never by client name unless the URL or context is already public
- Hiring, onboarding, remote ops, practical, not theoretical

Things Qamar will NOT write about:
- AI hype as a topic on its own
- "5 ways to..." listicles
- Generic productivity advice
- Anything that reads like a Medium post from 2019
`;

export async function generateDraft({
  topicSeed,
  recentTitles,
  knownTags,
  linkTargets,
  engagementFacts,
}: { topicSeed?: string } & DraftContext): Promise<Draft> {
  const userPrompt = `
Pick a topic and draft a blog post.

${topicSeed ? `Topic seed: ${topicSeed}` : "No topic seed, pick something timely from the focus areas above."}

Recent post titles (don't duplicate these):
${recentTitles.length > 0 ? recentTitles.map((t) => `- ${t}`).join("\n") : "(none yet)"}

Existing tag taxonomy (prefer these unless the post genuinely needs a new one):
${knownTags.length > 0 ? knownTags.join(", ") : "(none yet)"}

Engagement facts, quoted from the case studies published on this site. These
are the ONLY durations and dates you may state about the work:
${engagementFacts.length > 0 ? engagementFacts.map((f) => `- ${f}`).join("\n") : "(none published)"}

Link targets. Use two or three, copying the href exactly:
${linkTargets.map((t) => `- ${t.href} : ${t.title}`).join("\n")}

Output the draft. The body should be MDX, plain markdown headings + paragraphs are fine, no need for custom components.
`;

  const result = await generateObject({
    model: contentModel,
    schema: draftSchema,
    system: VOICE,
    prompt: userPrompt,
    maxRetries: 2,
  });

  return result.object;
}

export function draftToMdx(draft: Draft, publishedAt: string): string {
  const fm = [
    `title: ${JSON.stringify(draft.title)}`,
    `slug: ${JSON.stringify(draft.slug)}`,
    `excerpt: ${JSON.stringify(draft.excerpt)}`,
    `metaDescription: ${JSON.stringify(draft.metaDescription)}`,
    `publishedAt: ${JSON.stringify(publishedAt)}`,
    `tags: [${draft.tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    `draft: true`,
    `aiAssisted: true`,
  ].join("\n");
  return `---\n${fm}\n---\n\n${draft.body.trim()}\n`;
}
