#!/usr/bin/env tsx
// Walks every .mdx file under content/ and validates frontmatter against
// the matching zod schema. Wired into `prebuild`, bad frontmatter fails
// the build before deploy.
//
// Skips files under any `_drafts/` segment (those are AI-agent drafts;
// schema validation runs at promotion time, not while drafting).

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  blogPostSchema,
  caseStudySchema,
  graphicsItemSchema,
  homeBlockSchema,
  pageSchema,
  serviceSchema,
} from "../src/content/schema.js";
import type { ZodType } from "zod";

const ROOT = path.join(process.cwd(), "content");

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
