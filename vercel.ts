// Vercel project configuration. Replaces vercel.json — typed, supports
// dynamic logic, and reads env at build time.
//
// Cron entries here are placeholders. The AI SEO agent and social
// syndication queue are not implemented yet; the cron paths below will
// point at routes that don't exist in the first pass. When those land,
// the only change is to add the corresponding API route.

import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "pnpm build",
  installCommand: "pnpm install --frozen-lockfile",
  crons: [
    // Drafts a blog post twice a week into Vercel Blob.
    // Email notification fires; nothing publishes until I git-commit it.
    { path: "/api/cron/seo-agent", schedule: "0 14 * * 2,5" },
    // { path: "/api/cron/social-queue", schedule: "*/30 * * * *" }, // not built yet
  ],
};

export default config;
