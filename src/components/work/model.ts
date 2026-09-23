import { headingId } from "@/content/mdx";
import { DEMO_SCENES, type DemoScene } from "@/lib/demos";
import type { CaseStudy } from "@/content/schema";

// Pure helpers for the case-study pages. Nothing here adds a fact: it only
// chooses, orders and splits what the study already says.

/** A study's MDX body cut at its h2s, so each section can be wrapped (the
 *  "what broke" inset) and indexed (the sticky section rail). */
export type BodyChunk = {
  title: string | null;
  id: string | null;
  source: string;
  broke: boolean;
};

export function splitBody(body: string): BodyChunk[] {
  const chunks: BodyChunk[] = [];
  let title: string | null = null;
  let lines: string[] = [];
  let fenced = false;

  const flush = () => {
    const source = lines.join("\n").trim();
    if (source.length > 0) {
      chunks.push({
        title,
        id: title ? headingId(title) : null,
        source,
        broke: title ? /^what broke\b/i.test(title) : false,
      });
    }
  };

  for (const l of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(l)) fenced = !fenced;
    const m = fenced ? null : /^##\s+(.+?)\s*#*\s*$/.exec(l);
    if (m) {
      flush();
      title = m[1]!.replace(/[*_`]/g, "");
      lines = [l];
    } else {
      lines.push(l);
    }
  }
  flush();
  return chunks;
}

export function hasWhatBroke(body: string): boolean {
  return /^##\s+what broke\b/im.test(body);
}

/** Hyphenated compounds ("color-coded", "4-year") never break at the hyphen:
 *  a word joiner after it removes the break opportunity. Render-only; titles
 *  in metadata and structured data stay as written. */
const WORD_JOINER = String.fromCharCode(0x2060);
export function keepCompounds(text: string): string {
  return text.replace(/([\p{L}\d])-(?=[\p{L}\d])/gu, `$1-${WORD_JOINER}`);
}

/** The one sentence under a study's headline: its one-liner, or, for a study
 *  without one, the first sentence of its summary. The full summary stays the
 *  meta description and structured data. */
export function leadLine(meta: Pick<CaseStudy, "homeLine" | "summary">): string {
  if (meta.homeLine) return meta.homeLine;
  const first = meta.summary.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9])/)[0];
  return first ?? meta.summary;
}

/** Frontmatter prose is written as short paragraphs separated by blank lines. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// The one to three numbers worth putting at the top of each study, by label.
// A row that restates the h1, the lede or the cover figure stays out (the
// headline number already appears twice above it), and so does a row that
// only an engineer would parse. Values are printed exactly as the frontmatter
// has them.
// bs-hub's code audit ("63 findings ... 87 closed") stays out: out of
// context the two counts read as a mistake. The body explains them.
const GLANCE: Record<string, string[]> = {
  "bs-hub": ["Audit retention"],
  beeline: ["Production scale", "Coverage gaps", "Insurer directory"],
  "agency-operations-platform": ["Review flow", "Finance", "AI"],
  "driving-school-booking-pwa": ["First version", "Under 18"],
  "monday-rollout-agency": ["Workspaces"],
  "lucidlink-wasabi": ["Active storage", "Cost model"],
  "motion-design-portfolio": ["Status"],
};

export function glanceMetrics(meta: CaseStudy): CaseStudy["metrics"] {
  const pick = GLANCE[meta.slug];
  if (!pick) return meta.metrics.slice(0, 3);
  return pick
    .map((label) => meta.metrics.find((m) => m.label === label))
    .filter((m): m is CaseStudy["metrics"][number] => Boolean(m));
}

/** The sample-data scene a study's demo link points at, if we have its shot. */
export function demoSceneFor(meta: CaseStudy): DemoScene | null {
  if (!meta.demo) return null;
  const slug = meta.demo.href.replace(/\/+$/, "").split("/").pop() ?? "";
  return DEMO_SCENES.find((s) => s.slug === slug) ?? null;
}
