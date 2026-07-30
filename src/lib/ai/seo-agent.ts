// Core SEO-draft generator. Used by both the production cron route and
// the local script. Returns structured frontmatter + MDX body that the
// caller serializes to disk (locally) or to Vercel Blob (in prod).
//
// Generates through the direct Anthropic provider via the AI SDK. The
// model is centralised in lib/ai/provider.ts so call sites stay clean.

import { generateObject } from "ai";
import { z } from "zod";
import { contentModel } from "@/lib/ai/provider";

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
  tags: z
    .array(z.string().min(2).max(28))
    .min(1)
    .max(5)
    .describe("Lowercase, kebab-case if multi-word."),
  body: z
    .string()
    .min(900)
    .describe(
      "MDX body, ~600-1100 words. Use ## headings. Avoid emoji. Avoid hedging filler.",
    ),
});

export type Draft = z.infer<typeof draftSchema>;

const VOICE = `
You are the AI SEO agent for gravixar.com, Qamar's personal brand site.
Qamar runs a one-person operations consultancy. He builds working systems
(client portals, hiring tools, AI integrations) and refuses to ship slides.

Voice rules, non-negotiable:
- Concrete-and-honest. Name specific tools, specific numbers, specific decisions.
- No marketing fluff. No "in today's fast-paced world." No "leverage" used as a verb.
- Refuse hedging. If you're not sure, say so. Don't pad with "could potentially."
- First-person singular ("I"). This is Qamar's writing, never "we" or "our team."
- One opinion per post. The reader should know what Qamar thinks by the end.
- Short paragraphs. Active voice. Cut adverbs.

What Qamar actually writes about:
- Operations infrastructure for small teams (project portals, delivery governance)
- AI agents and integrations, with strong skepticism toward auto-publish patterns
- The trade-offs in shipping early vs. polishing
- The specific bugs and decisions in his current projects (an agency portal he's run for 4 years, a healthcare credentialing platform live in production) — refer to them generically, never by client name unless the URL or context is already public
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
}: {
  topicSeed?: string;
  recentTitles: string[];
  knownTags: string[];
}): Promise<Draft> {
  const userPrompt = `
Pick a topic and draft a blog post.

${topicSeed ? `Topic seed: ${topicSeed}` : "No topic seed, pick something timely from the focus areas above."}

Recent post titles (don't duplicate these):
${recentTitles.length > 0 ? recentTitles.map((t) => `- ${t}`).join("\n") : "(none yet)"}

Existing tag taxonomy (prefer these unless the post genuinely needs a new one):
${knownTags.length > 0 ? knownTags.join(", ") : "(none yet)"}

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
    `publishedAt: ${JSON.stringify(publishedAt)}`,
    `tags: [${draft.tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    `draft: true`,
    `aiAssisted: true`,
  ].join("\n");
  return `---\n${fm}\n---\n\n${draft.body.trim()}\n`;
}
