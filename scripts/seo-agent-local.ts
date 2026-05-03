#!/usr/bin/env tsx
// Local equivalent of the SEO-agent cron. Same generation logic, but
// writes to the filesystem under content/blog/_drafts/ so you can
// iterate in your editor without round-tripping through Blob.
//
//   pnpm seo:draft
//   pnpm seo:draft "the case against auto-publishing AI content"
//
// Approval workflow:
//   1. Open the file under content/blog/_drafts/, edit anything you want
//   2. `git mv` it to content/blog/ and flip `draft: false` in frontmatter
//   3. `pnpm validate:content` to confirm frontmatter parses
//   4. Commit, push

import fs from "node:fs/promises";
import path from "node:path";
import { loadBlogPosts } from "../src/content/loaders.js";
import { draftToMdx, generateDraft } from "../src/lib/ai/seo-agent.js";

async function main() {
  const topicSeed = process.argv.slice(2).join(" ") || undefined;

  const posts = await loadBlogPosts({ includeDrafts: true });
  const recentTitles = posts.slice(0, 10).map((p) => p.meta.title);
  const knownTags = Array.from(new Set(posts.flatMap((p) => p.meta.tags)));

  console.log("Generating draft via Anthropic via AI Gateway…");
  if (topicSeed) console.log(`  topic seed: ${topicSeed}`);
  console.log(`  ${recentTitles.length} recent titles in context`);
  console.log(`  ${knownTags.length} existing tags in taxonomy`);

  const start = Date.now();
  const draft = await generateDraft({ topicSeed, recentTitles, knownTags });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  done in ${elapsed}s`);

  const date = new Date().toISOString().slice(0, 10);
  const mdx = draftToMdx(draft, date);
  const filename = `${date}-${draft.slug}.mdx`;
  const filepath = path.join(
    process.cwd(),
    "content",
    "blog",
    "_drafts",
    filename,
  );

  await fs.writeFile(filepath, mdx, "utf-8");

  console.log(``);
  console.log(`Draft written: ${path.relative(process.cwd(), filepath)}`);
  console.log(`Title:         ${draft.title}`);
  console.log(`Tags:          ${draft.tags.join(", ")}`);
  console.log(``);
  console.log(`Next: open the file, edit, then`);
  console.log(`  git mv "${filepath}" "${filepath.replace(`${path.sep}_drafts${path.sep}`, path.sep)}"`);
  console.log(`  flip "draft: true" → "draft: false" in frontmatter`);
  console.log(`  pnpm validate:content && git commit`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
