// Runtime env validation. Call site: any module that touches process.env
// should import from here rather than reading directly.

import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://gravixar.com"),
  NEXT_PUBLIC_CAL_USERNAME: z.string().min(1).default("qamar"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  LEAD_NOTIFY_EMAIL: z.string().email().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Fine-grained GitHub PAT for the SEO agent (Phase 6.B4).
  // Scope: Contents Read + Write on gravixar-sv/gravixar-marketing.
  // When set, the agent commits drafts directly to
  // content/blog/_drafts/<date>-<slug>.mdx instead of writing to Blob.
  // When unset, the agent falls back to the legacy blob+email flow.
  MARKETING_GH_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` on each invocation.
  // Set this in production env; leave unset locally and use the seo:draft script instead.
  CRON_SECRET: z.string().optional(),
  // Shared secret for manual Trend Radar runs triggered from HQ /content.
  // HQ sends `Authorization: Bearer ${TREND_RADAR_TRIGGER_SECRET}`; the
  // trend-radar route accepts it as an alternative to CRON_SECRET. Set the
  // SAME value in both this project and HQ's Vercel env.
  TREND_RADAR_TRIGGER_SECRET: z.string().optional(),
  // Admin token for the /admin dashboard. Set in Vercel production env.
  // If unset, the admin page returns 503 (admin disabled).
  ADMIN_TOKEN: z.string().optional(),
  // In-house "book a call" (replaces cal.com). HMAC secret signs the
  // email verification codes; MEET_URL is the reusable Google Meet room
  // shared on confirmation. Both set in Vercel production env.
  BOOKING_HMAC_SECRET: z.string().optional(),
  BOOKING_MEET_URL: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail loud on the server, no-op on the client (zod will fall through to
  // defaults for NEXT_PUBLIC_*, which is what the client actually needs).
  if (typeof window === "undefined") {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
}

export const env = parsed.success ? parsed.data : schema.parse({});
