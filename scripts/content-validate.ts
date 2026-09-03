#!/usr/bin/env tsx
// Walks every .mdx file under content/ and validates frontmatter against
// the matching zod schema. Wired into `prebuild`, bad frontmatter fails
// the build before deploy.
//
// Skips files under any `_drafts/` segment (those are AI-agent drafts;
// schema validation runs at promotion time, not while drafting).
//
// Also validates content/data/system-stats.json, which is not an MDX
// section, and enforces a staleness gate on it: numbers on the homepage
// expire, so an un-recounted stat warns at 45 days and fails at 90.
//
// And enforces the em-dash ban, which until 2026-09-02 lived only in
// CLAUDE.md and was therefore enforced by whoever remembered it. It leaked:
// 34 em-dashes were live across 8 pages on the day this check was written.
// A rule a build cannot check is a preference.

import ts from "typescript";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  blogPostSchema,
  caseStudySchema,
  compareSchema,
  graphicsItemSchema,
  homeBlockSchema,
  moduleSchema,
  pageSchema,
  serviceSchema,
  systemStatsSchema,
} from "../src/content/schema.js";
import type { ZodType } from "zod";

const ROOT = path.join(process.cwd(), "content");
const SRC_ROOT = path.join(process.cwd(), "src");
const STATS_FILE = path.join(ROOT, "data", "system-stats.json");

// A number is only as good as its last recount. Warn first, then fail,
// so a stat gets fixed on a normal build before it blocks a deploy.
const STALE_WARN_DAYS = 45;
const STALE_FAIL_DAYS = 90;

type Section = {
  dir: string;
  schema: ZodType;
  label: string;
};

const SECTIONS: Section[] = [
  { dir: "blog", schema: blogPostSchema, label: "blog" },
  { dir: "case-studies", schema: caseStudySchema, label: "case-studies" },
  { dir: "services", schema: serviceSchema, label: "services" },
  { dir: "graphics", schema: graphicsItemSchema, label: "graphics" },
  { dir: "home", schema: homeBlockSchema, label: "home" },
  { dir: "pages", schema: pageSchema, label: "pages" },
  { dir: "compare", schema: compareSchema, label: "compare" },
  { dir: "modules", schema: moduleSchema, label: "modules" },
];

const inDrafts = (rel: string) =>
  rel.split(path.sep).some((s) => s === "_drafts");

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile() && /\.mdx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const ageInDays = (isoDay: string) =>
  Math.floor((Date.now() - Date.parse(`${isoDay}T00:00:00Z`)) / 86_400_000);

// Returns 1 if the file is unusable or any stat is past the fail window,
// 0 otherwise. Warnings do not fail the build.
async function validateSystemStats(): Promise<number> {
  const rel = path.relative(ROOT, STATS_FILE);
  const label = "system-stats";

  let raw: string;
  try {
    raw = await fs.readFile(STATS_FILE, "utf-8");
  } catch {
    console.error(`\n[${label}] ${rel}`);
    console.error("  - (root): file missing, homepage stats have no source of truth");
    return 1;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`\n[${label}] ${rel}`);
    console.error(`  - (root): invalid JSON, ${(err as Error).message}`);
    return 1;
  }

  const result = systemStatsSchema.safeParse(json);
  if (!result.success) {
    console.error(`\n[${label}] ${rel}`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return 1;
  }

  let expired = 0;
  for (const stat of result.data.stats) {
    const age = ageInDays(stat.verifiedAt);
    if (age > STALE_FAIL_DAYS) {
      if (expired === 0) console.error(`\n[${label}] ${rel}`);
      expired++;
      console.error(
        `  - stats.${stat.key}: verified ${stat.verifiedAt}, ${age} days ago (limit ${STALE_FAIL_DAYS}). Recount "${stat.label}" against ${stat.source}, then bump verifiedAt.`,
      );
    } else if (age > STALE_WARN_DAYS) {
      console.warn(
        `[${label}] warning: stats.${stat.key} ("${stat.label}") was verified ${age} days ago, recount due. Source: ${stat.source}`,
      );
    }
  }

  return expired > 0 ? 1 : 0;
}

// EM-DASH BAN. The rule is "no em-dashes in marketing copy", and the reason is
// that it reads as an LLM tell. It applies to frontmatter and body alike,
// because both are published: a summary becomes a meta description, a title
// becomes a <title>.
//
// U+2014 only. The en-dash (U+2013) is deliberately NOT banned; it has
// legitimate uses in ranges ("4-10 weeks" is usually written with a hyphen
// here, but a date range is not the tell the rule is aimed at).
//
// SCOPE NOTE, updated 2026-09-03: this used to cover content/ only, and said
// so. It now also covers src/, see validateSrcDashes below. Still NOT covered:
// the /careers pages, which are fed from a snapshot HQ publishes and never
// pass through this file. Fixing those means fixing them in HQ, or checking
// the snapshot at the ingest boundary in src/lib/careers.ts. Pretending
// otherwise by only checking what is easy to reach would make this look
// complete when it is not.
// Written as an escape rather than the literal character on purpose, so this
// file can state the rule without breaking its own rule.
const EM_DASH = "\u2014";

function emDashHits(raw: string): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = [];
  raw.split(/\r?\n/).forEach((line, i) => {
    if (line.includes(EM_DASH)) {
      hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
    }
  });
  return hits;
}

// PRICED CLAIMS ABOUT A COMPETITOR NEED A SOURCE. Scoped to content/compare,
// because that is where this site talks about other people's pricing and
// where it got a figure wrong: productive-io-vs-custom.mdx published a
// competitor cost two to three times the real published rate until
// 2026-09-01, and no build step could have caught it.
//
// The gate is deliberately blunt. It does not try to map each figure to a
// specific source entry, because a regex cannot tell which of five dollar
// amounts a given URL backs. It asserts the weaker but checkable thing: if
// this page states a price at all, it must carry at least one source with a
// URL and a verifiedAt. That turns "did anyone check this" from a question
// a reviewer has to remember into one the build answers.
function comparePricingHasSource(
  rel: string,
  raw: string,
  data: Record<string, unknown>,
): string[] {
  if (!rel.replace(/\\/g, "/").startsWith("compare/")) return [];
  const priced = /\x24\d/.test(raw);
  if (!priced) return [];
  const sources = data.sources;
  if (Array.isArray(sources) && sources.length > 0) return [];
  return [
    "states a price but has no `sources` entry. Add sources: [{ claim, url, verifiedAt }] naming where the figure was read.",
  ];
}

// CASE-STUDY METRICS PROVENANCE. The homepage carries four numbers, each with
// a source and a recount date, staleness-gated at 45 and 90 days. The case
// studies carry 48, and until 2026-09-02 they had neither. Same site, same
// buyer, and the ungoverned set is twelve times larger and denser.
//
// Two rules, deliberately different in severity:
//
//   HALF-PROVENANCE FAILS IMMEDIATELY. A row with a source and no date, or a
//   date and no source, is worse than a bare row: it reads as checked without
//   being checkable. There is no grace period for that.
//
//   BARE ROWS WARN, THEN FAIL FROM A NAMED DATE. They are not an error today
//   because the provenance for most of them lives with the operator rather
//   than in the repo, and a rule that forced the field on the day it shipped
//   would have been satisfied by inventing 48 plausible-sounding sources,
//   which is the precise defect the field exists to prevent. The date below
//   is the ratchet: after it, the build stops.
const METRICS_SOURCE_REQUIRED_FROM = "2026-11-01";

type MetricRow = { label?: unknown; value?: unknown; source?: unknown; verifiedAt?: unknown };

function metricsProvenance(
  rel: string,
  data: Record<string, unknown>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows = data.metrics;
  if (!Array.isArray(rows)) return { errors, warnings };

  const pastRatchet =
    new Date().toISOString().slice(0, 10) >= METRICS_SOURCE_REQUIRED_FROM;

  rows.forEach((row: MetricRow, i) => {
    const hasSource = typeof row.source === "string" && row.source.length > 0;
    const hasDate = typeof row.verifiedAt === "string" && row.verifiedAt.length > 0;
    const label = typeof row.label === "string" ? row.label : `metrics[${i}]`;

    if (hasSource !== hasDate) {
      errors.push(
        `metrics["${label}"]: has ${hasSource ? "source but no verifiedAt" : "verifiedAt but no source"}. Provenance is both or neither.`,
      );
      return;
    }
    if (!hasSource) {
      const msg = `metrics["${label}"]: published number with no source and no verifiedAt.`;
      if (pastRatchet) errors.push(msg);
      else warnings.push(msg);
    }
  });

  return { errors, warnings };
}

// EM-DASH BAN, PART TWO: the surfaces the content walker cannot see.
//
// A sweep on 2026-09-03 found 73 em-dashes under src/, and the split is the
// whole design of this check:
//
//    44  code comments        never rendered, so deliberately NOT checked
//     4  the guards           a regex character class in chat/gate.ts and
//                             chat/pack.ts, plus the voice doc's own statement
//                             of this rule, all of which MUST keep the
//                             character in order to work
//    11  generation prompts   the model was being shown em-dashes by the very
//                             documents instructing it not to use them, and
//                             ai/trend-radar.ts carried them in its OUTPUT
//                             template, so every brief it generated shipped
//                             them by construction
//    13  user-facing strings  including the summary line of the calendar
//                             invite sent to every client who books a call
//
// So the rule is: text that can reach a human or a model is in scope, and
// everything else is not. That distinction is not expressible as a line regex,
// which is why this parses with the TypeScript AST and looks only at string
// literals, template literals and JSX text. Regex literals are not text nodes,
// so the two guards above are excluded for free rather than by an allowlist.
//
// Markdown under src/ (the voice doc, which is pasted into prompts) has no AST
// to lean on, so it is scanned by line, with one carve-out: a line that is
// ABOUT the rule keeps its example of the banned character.
//
// Opt out of a single line with the marker, and say why on the same line.
const DASH_OK = "em-dash-ok";

async function walkSrc(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkSrc(full, out);
    else if (e.isFile() && /\.(ts|tsx|md)$/.test(e.name)) out.push(full);
  }
  return out;
}

function srcDashHits(file: string, raw: string): { line: number; text: string }[] {
  const lines = raw.split(/\r?\n/);
  const flagged = new Set<number>();

  if (file.endsWith(".md")) {
    lines.forEach((line, i) => {
      if (!line.includes(EM_DASH)) return;
      // A line stating the ban has to be able to show the character.
      if (/em[- ]dash|en[- ]dash/i.test(line)) return;
      flagged.add(i + 1);
    });
  } else {
    const sf = ts.createSourceFile(
      file,
      raw,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node): void => {
      const isText =
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node);
      if (isText) {
        // Report the line the character is ON, not the line the node starts
        // on: a template literal can span twenty lines.
        const start = node.getStart(sf);
        const text = raw.slice(start, node.getEnd());
        let idx = text.indexOf(EM_DASH);
        while (idx !== -1) {
          flagged.add(sf.getLineAndCharacterOfPosition(start + idx).line + 1);
          idx = text.indexOf(EM_DASH, idx + 1);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  return [...flagged]
    .sort((a, b) => a - b)
    .filter((n) => !(lines[n - 1] ?? "").includes(DASH_OK))
    .map((n) => ({ line: n, text: (lines[n - 1] ?? "").trim().slice(0, 120) }));
}

/** Returns 1 if any src/ file carries an em-dash in text that ships. */
async function validateSrcDashes(): Promise<number> {
  const files = await walkSrc(SRC_ROOT);
  let badFiles = 0;
  let badLines = 0;
  for (const file of files) {
    const raw = await fs.readFile(file, "utf-8");
    if (!raw.includes(EM_DASH)) continue;
    const hits = srcDashHits(file, raw);
    if (hits.length === 0) continue;
    badFiles++;
    badLines += hits.length;
    console.error(`\n[src] ${path.relative(process.cwd(), file)}`);
    for (const h of hits) {
      console.error(
        `  - line ${h.line}: em-dash in text that reaches a human or a model. Use a comma, a period or a colon.`,
      );
      console.error(`      ${h.text}`);
    }
  }
  if (badFiles > 0) {
    console.error(
      `\n[src] ${badLines} em-dash(es) across ${badFiles} file(s). Comments are exempt; if this one is deliberate, add "${DASH_OK}" on the line with a reason.`,
    );
  }
  return badFiles > 0 ? 1 : 0;
}

async function main() {
  let total = 0;
  let failures = 0;
  let unsourcedMetrics = 0;

  for (const { dir, schema, label } of SECTIONS) {
    const sectionDir = path.join(ROOT, dir);
    const files = await walk(sectionDir);
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (inDrafts(rel)) continue;
      total++;
      const raw = await fs.readFile(file, "utf-8");

      const dashes = emDashHits(raw);
      if (dashes.length > 0) {
        failures++;
        console.error(`
[${label}] ${rel}`);
        for (const d of dashes) {
          console.error(`  - line ${d.line}: em-dash. Use a comma, a period or a colon.`);
          console.error(`      ${d.text}`);
        }
      }

      const { data } = matter(raw);

      const { errors: metricErrors, warnings: metricWarnings } =
        metricsProvenance(rel, data);
      if (metricErrors.length > 0) {
        failures++;
        console.error(`\n[${label}] ${rel}`);
        for (const e of metricErrors) console.error(`  - ${e}`);
      }
      for (const w of metricWarnings) {
        unsourcedMetrics++;
        console.warn(`[${label}] warning: ${rel} ${w} Required from ${METRICS_SOURCE_REQUIRED_FROM}.`);
      }

      const priceIssues = comparePricingHasSource(rel, raw, data);
      if (priceIssues.length > 0) {
        failures++;
        console.error(`
[${label}] ${rel}`);
        for (const issue of priceIssues) console.error(`  - ${issue}`);
      }

      const result = schema.safeParse(data);
      if (!result.success) {
        failures++;
        console.error(`\n[${label}] ${rel}`);
        for (const issue of result.error.issues) {
          console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
        }
      }
    }
  }

  // Not an MDX section, own step, counted in the same tally.
  total++;
  failures += await validateSystemStats();

  // Nor is src/, but the em-dash rule applies to anything that ships.
  total++;
  failures += await validateSrcDashes();

  if (failures > 0) {
    console.error(`\n${failures}/${total} content files failed validation.`);
    process.exit(1);
  }

  if (unsourcedMetrics > 0) {
    console.warn(
      `\n[case-studies] ${unsourcedMetrics} published metric(s) still carry no source or verifiedAt. These become BUILD ERRORS from ${METRICS_SOURCE_REQUIRED_FROM}.`,
    );
  }

  console.log(`OK, ${total} content files validated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
