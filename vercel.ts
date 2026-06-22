// Vercel project configuration. Replaces vercel.json, typed, supports
// dynamic logic, and reads env at build time.

import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "pnpm build",
  installCommand: "pnpm install --frozen-lockfile",
  crons: [
    // SEO agent: drafts a blog post twice a week into Vercel Blob.
    // Email notification fires; nothing publishes until I git-commit it.
    { path: "/api/cron/seo-agent", schedule: "0 14 * * 2,5" },
    // Trend Radar: biweekly market scan on the 1st and 15th at 10:00 UTC.
    // Produces a ranked Trend Brief (3-5 signals) committed to Blob.
    // Human triages each signal; nothing auto-acts.
    { path: "/api/cron/trend-radar", schedule: "0 10 1,15 * *" },
    // Job indexing: daily ping to Google's Indexing API for open JobPosting
    // URLs (and removals for closed roles) so Google for Jobs picks up changes
    // fast. No-ops without GOOGLE_INDEXING_CREDENTIALS.
    { path: "/api/cron/index-jobs", schedule: "0 6 * * *" },
  ],
};

export default config;
