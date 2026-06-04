// Job application — careers-funnel lead capture. A visitor applies from a
// specific /careers/<slug> page; the page slug travels with the record into
// HQ Inbox as LeadKind = JOB_APPLICATION, sourcePage = "/careers/<slug>".
//
// HQ consumes these via /api/cron/sync-leads from the
// `job-applications/YYYY-MM.jsonl` Blob prefix. The shape here MUST mirror
// `RawJobApplicationRecord` in gravixar-hq/src/lib/leads/marketing-blob.ts
// (required by HQ's validator: id, name, email, message, sourcePage,
// createdAt). Keep the two in sync.

import { z } from "zod";

export const jobApplicationSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  // Current employer (optional). Maps to HQ Lead.company.
  company: z.string().max(160).optional(),
  // Cover note / why-this-role. HQ requires a non-empty message.
  message: z.string().min(20).max(4000),
  // The careers-page slug the visitor applied from, e.g.
  // "/careers/founding-engineer". Set by the form from page context.
  sourcePage: z.string().min(1).max(120),
  // CV / portfolio / LinkedIn URL. Optional, but the form encourages it;
  // HQ renders it on the lead card (http(s) only).
  link: z.string().url().max(400).optional(),
  // Honeypot, must be empty. Bots fill every input.
  website: z.string().max(0).optional(),
  // Optional UTM-ish tag, set by the form.
  source: z.string().max(80).optional(),
});

export type JobApplication = z.infer<typeof jobApplicationSchema>;

export type JobApplicationRecord = JobApplication & {
  id: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
};
