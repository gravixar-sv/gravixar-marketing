// Trend Radar -> SEO draft handoff. Closes the last content-engine gap:
// a `content-angle` signal from a Trend Brief is auto-converted into a
// blog draft committed to `content/blog/_drafts/`, where HQ /content
// picks it up for a one-click Promote -> PR.
//
// Design constraints (deliberate, match the rest of the content engine):
// - Repo-mode only. Requires MARKETING_GH_TOKEN. No token -> no handoff
//   (the brief's content-angle still reaches the operator via email).
// - Capped at ONE draft per run (the top-ranked content-angle signal).
//   Signals are ranked most-actionable-first, so this is the best lead.
//   Keeps the run inside the function time budget and avoids draft spam.
// - The approval gate is unchanged: drafts live under _drafts/ (excluded
//   from the production build) and only publish via the Promote -> PR
//   step. The agent never publishes; it only stages.
// - Fail-open. A handoff failure must never lose the brief that already
//   stored successfully. The caller treats this as best-effort.

import { loadBlogPosts } from "@/content/loaders";
import { commitFileToMain } from "@/lib/ai/repo-commit";
import { draftToMdx, generateDraft } from "@/lib/ai/seo-agent";
import type { TrendBrief, TrendSignal } from "@/lib/ai/trend-radar";

export type HandoffResult =
  | { drafted: true; slug: string; title: string; path: string; url: string; commitSha: string; seedSignal: string }
  | { drafted: false; reason: string };

/** Pick the highest-ranked content-angle signal, if any. */
export function pickContentAngle(brief: TrendBrief): TrendSignal | null {
  return brief.signals.find((s) => s.action === "content-angle") ?? null;
}

/**
 * Build the topic seed handed to the SEO agent. Combines the signal line
 * with its action note so the draft is anchored to the radar's intent,
 * not a free pick.
 */
function buildTopicSeed(signal: TrendSignal): string {
  return `${signal.signal}\n\nAngle to develop: ${signal.action_note}\n\nWhy it matters: ${signal.why}`;
}

/**
 * Convert the top content-angle signal of a brief into a committed draft.
 * Best-effort: returns a structured result either way, never throws.
 */
export async function handoffTopContentAngle({
  brief,
  date,
  token,
}: {
  brief: TrendBrief;
  /** Run date, YYYY-MM-DD — used in the draft filename + frontmatter. */
  date: string;
  /** MARKETING_GH_TOKEN. Caller guarantees it is set. */
  token: string;
}): Promise<HandoffResult> {
  const signal = pickContentAngle(brief);
  if (!signal) {
    return { drafted: false, reason: "no content-angle signal in this brief" };
  }

  try {
    const posts = await loadBlogPosts({ includeDrafts: true });
    const recentTitles = posts.slice(0, 10).map((p) => p.meta.title);
    const knownTags = Array.from(new Set(posts.flatMap((p) => p.meta.tags)));

    const draft = await generateDraft({
      topicSeed: buildTopicSeed(signal),
      recentTitles,
      knownTags,
    });

    const mdx = draftToMdx(draft, date);
    const path = `content/blog/_drafts/${date}-${draft.slug}.mdx`;

    const commit = await commitFileToMain({
      token,
      path,
      content: mdx,
      message: `draft(blog): ${draft.title} [trend-radar handoff]`,
    });

    if (!commit.ok) {
      return { drafted: false, reason: `commit failed: ${commit.error}` };
    }

    return {
      drafted: true,
      slug: draft.slug,
      title: draft.title,
      path,
      url: commit.url,
      commitSha: commit.commitSha,
      seedSignal: signal.signal,
    };
  } catch (err) {
    return {
      drafted: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
