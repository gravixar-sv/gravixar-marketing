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

async function main() {
  let total = 0;
  let failures = 0;

  for (const { dir, schema, label } of SECTIONS) {
    const sectionDir = path.join(ROOT, dir);
    const files = await walk(sectionDir);
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (inDrafts(rel)) continue;
      total++;
      const raw = await fs.readFile(file, "utf-8");
      const { data } = matter(raw);
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

  if (failures > 0) {
    console.error(`\n${failures}/${total} content files failed validation.`);
    process.exit(1);
  }

  console.log(`OK, ${total} content files validated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
