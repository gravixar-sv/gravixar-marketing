// Vercel project configuration. Replaces vercel.json, typed, supports
// dynamic logic, and reads env at build time.

import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "pnpm build",
  installCommand: "pnpm install --frozen-lockfile",
  crons: [
    // SEO agent's weekly schedule (Tuesday 14:00 UTC) was RETIRED on
    // 2026-09-27, a day after Trend Radar's. It drafted from one Claude
    // Sonnet 4.6 call with the last 10 post titles as its only context: no
    // research, no search data, no fact files, and no check on the queue, so
    // its drafts filled the two slots the researched Monday routine needs
    // (both drafts pending on 2026-09-27 came from the cloud generators).
    // The case for keeping it as the floor ("runs when no machine is on")
    // no longer holds: the Monday routine, `gravixar-weekly-research-draft`
    // on the operator's machine, runs a missed Monday the next time the app
    // is open. The route stays, because HQ's /content "Draft now" button
    // calls it on demand. Decision:
    // content-drafting-one-researched-routine-per-site (HQ brain).
    //
    // Trend Radar's schedule (1st and 15th, 10:00 UTC) was RETIRED on
    // 2026-09-26: the Monday routine writes a sourced Trend Brief
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
