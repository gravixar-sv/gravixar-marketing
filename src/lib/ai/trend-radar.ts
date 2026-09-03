// Trend Radar core generator. Used by the production biweekly cron
// route. Mirrors the seo-agent.ts pattern exactly: generateObject via
// the direct Anthropic provider, structured output, fail-open on errors.
//
// Output: a ranked Trend Brief — 3-5 signals, each with a suggested
// action type (content-angle | offer-pricing | watch). Never auto-acts.
// The caller commits the brief to Vercel Blob; a human triages.

import { generateObject } from "ai";
import { z } from "zod";
import { contentModel } from "@/lib/ai/provider";

// Fixed, version-controlled query set. Reviewed quarterly — update the
// array and commit when the radar scope needs adjusting. Keeping it here
// means changes are tracked in git and visible in code review.
export const RADAR_QUERIES = [
  "AI services market pricing trends 2026",
  "productized and recurring operations consulting models",
  "fractional ops and fractional AI officer market",
  "vertical SaaS and micro-SaaS for agencies",
  "AI media economics: image, video, content generation pricing",
  "AI-ops agency competitor landscape and positioning moves",
] as const;

export const signalSchema = z.object({
  signal: z
    .string()
    .describe("What changed, in one concrete line, no hedging."),
  why: z
    .string()
    .describe(
      "Why it matters to Gravixar, tied to a specific service or segment (operations infrastructure, AI tooling, brand & visuals, or recurring revenue model).",
    ),
  action: z
    .enum(["content-angle", "offer-pricing", "watch"])
    .describe(
      "content-angle = hand to Fajar for a post; offer-pricing = evaluate as a brain decision; watch = no action yet, track it.",
    ),
  action_note: z
    .string()
    .describe(
      "Specific: what to write, what to price-test, or what to monitor next run.",
    ),
});

export const briefSchema = z.object({
  signals: z
    .array(signalSchema)
    .min(2)
    .max(6)
    .describe("Ranked by relevance to Gravixar, most actionable first."),
  summary: z
    .string()
    .describe(
      "One-paragraph synthesis of the brief. What does this run's data say about Gravixar's position right now?",
    ),
});

export type TrendBrief = z.infer<typeof briefSchema>;
export type TrendSignal = z.infer<typeof signalSchema>;

const SYSTEM_PROMPT = `
You are the Trend Radar agent for Gravixar, an operations consultancy run by Qamar.
Gravixar builds operations infrastructure, AI tooling, and brand systems for agencies, founders,
and DTC brands. Revenue model is shifting toward recurring retainers (Support/Evolution on every build).
Primary audience: agencies (client portals, ops tooling) and founders (AI-augmented product ops).

Your job each run:
- Scan the fixed query set and surface 3-5 concrete, ranked signals.
- Tie every signal directly to one of Gravixar's service lines or revenue levers.
- Be blunt. If a trend makes a Gravixar service less relevant, say so.
- Suggest exactly one action type per signal: content-angle, offer-pricing, or watch.

Voice rules (same as the site):
- Concrete and honest. Specific tools, numbers, decisions.
- No fluff. No "in today's fast-paced world." No "leverage" as a verb.
- No em-dashes. Use commas or periods.
- First-person singular context (Qamar's perspective) even though you're the agent.
- Short, active sentences.

Gravixar's service lines for context:
1. Operations infrastructure: client portals, delivery governance, approval flows, audit trails.
2. AI tooling: agents, intake wizards, content pipelines, always human-in-the-loop.
3. Brand & visuals: AI-generated brand assets, motion review, Amazon A+ workflows.
4. Recurring retainer: Support/Evolution on every build, the target revenue model.
`;

export async function generateBrief({
  runDate,
  previousSummary,
}: {
  runDate: string;
  previousSummary?: string;
}): Promise<TrendBrief> {
  const prompt = `
Run date: ${runDate}

Scan across these query areas and surface the most relevant signals:
${RADAR_QUERIES.map((q, i) => `${i + 1}. ${q}`).join("\n")}

${
  previousSummary
    ? `Previous run summary (avoid repeating signals unless materially updated):\n${previousSummary}\n`
    : "First run, no prior summary to avoid."
}

Produce a ranked Trend Brief with 3-5 signals. Most actionable to Gravixar goes first.
`;

  const result = await generateObject({
    model: contentModel,
    schema: briefSchema,
    system: SYSTEM_PROMPT,
    prompt,
    maxRetries: 2,
  });

  return result.object;
}

export function briefToMarkdown(brief: TrendBrief, runDate: string): string {
  const ACTION_LABELS: Record<TrendSignal["action"], string> = {
    "content-angle": "Content angle",
    "offer-pricing": "Offer / pricing",
    watch: "Watch",
  };

  const signals = brief.signals
    .map(
      (s, i) => `
## Signal ${i + 1}: ${s.action === "content-angle" ? "Content angle" : s.action === "offer-pricing" ? "Offer / pricing" : "Watch"}

**${s.signal}**

**Why it matters:** ${s.why}

**Action (${ACTION_LABELS[s.action]}):** ${s.action_note}
`.trim(),
    )
    .join("\n\n---\n\n");

  return `---
runDate: "${runDate}"
signalCount: ${brief.signals.length}
---

# Trend Brief ${runDate}

${brief.summary}

---

${signals}
`.trimStart();
}