// Vercel project configuration. Replaces vercel.json, typed, supports
// dynamic logic, and reads env at build time.

import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "pnpm build",
  installCommand: "pnpm install --frozen-lockfile",
  crons: [
    // SEO agent: drafts a blog post once a week, Tuesday 14:00 UTC.
    // Email notification fires; nothing publishes until I git-commit it.
    //
    // Was Tuesday AND Friday until 2026-09-08. A second generator runs on
    // the operator's machine: since 2026-09-19 the scheduled Claude Code
    // task `gravixar-weekly-research-draft`, Mondays 13:00 PKT (08:00 UTC),
    // which researches with sources, writes the Trend Brief, and drafts with
    // the whole repo and the brain in context, so it can check every figure
    // against the case study or ledger it came from. (It replaced a Friday
    // task of the same kind.) Leaving both at full rate would push three
    // drafts a week into a queue whose bottleneck was never generation: 8
    // posts published in June, 1 in August, with this cron producing
    // throughout.
    //
    // This one stays as the reliable floor rather than being retired. It runs
    // in the cloud whether or not any machine is switched on, and the failure
    // this pipeline actually had was going silent for two months. The Monday
    // routine is the better writer; this is the one that always turns up.
    { path: "/api/cron/seo-agent", schedule: "0 14 * * 2" },
    // Trend Radar's schedule (1st and 15th, 10:00 UTC) was RETIRED on
    // 2026-09-26: the Monday routine above writes a sourced Trend Brief
    // every week to the same Blob path HQ reads, so this unsourced one on a
    // small serverless model only competed with it. The route stays, because
    // HQ's /content "Run now" button calls it on demand. Decision:
    // trend-radar-cron-retired-weekly-routine-writes-the-brief (HQ brain).
    //
    // Job indexing: daily ping to Google's Indexing API for open JobPosting
    // URLs (and removals for closed roles) so Google for Jobs picks up changes
    // fast. No-ops without GOOGLE_INDEXING_CREDENTIALS.
    { path: "/api/cron/index-jobs", schedule: "0 6 * * *" },
  ],
};

export default config;
