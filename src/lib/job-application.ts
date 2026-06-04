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

// A name should read like a human name, not a URL or markup. Letters of any
// script (\p{L}) + combining marks (\p{M}), with spaces, apostrophes, hyphens
// and periods; the first character must be a letter. This rejects digits,
// angle brackets, slashes and @ at the entry point. Output is already escaped
// end to end (HQ renders no raw HTML), so this is defence in depth, not the
// only wall.
export const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u;

// Loose international phone shape: an optional +/( then digits with the usual
// separators. Deliberately not strict E.164 so Pakistani local and overseas
// numbers both pass; we only guarantee it looks like a phone number.
export const PHONE_RE = /^[+(]?\d[\d\s().-]{5,30}$/;

// CV upload constraints. Enforced both on the client (UX) and, authoritatively,
// in the client-upload token route's onBeforeGenerateToken (Blob rejects an
// oversized or wrong-type file at the source). PDF + Word only.
export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — ample for a CV
export const CV_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const CV_ACCEPT = ".pdf,.doc,.docx";

export const jobApplicationSchema = z.object({
  name: z.string().trim().min(2).max(80).regex(NAME_RE, "use your name only"),
  email: z.string().trim().email().max(160),
  // Contact phone (required) so I can reach a strong applicant quickly.
  phone: z
    .string()
    .trim()
    .min(7)
    .max(32)
    .regex(PHONE_RE, "enter a valid phone number"),
  // Current employer (optional). Maps to HQ Lead.company.
  company: z.string().trim().max(160).optional(),
  // Cover note / why-this-role. HQ requires a non-empty message.
  message: z.string().trim().min(20).max(4000),
  // The careers-page slug the visitor applied from, e.g.
  // "/careers/founding-engineer". Set by the form from page context.
  sourcePage: z.string().min(1).max(120),
  // LinkedIn / portfolio URL (optional). HQ renders it on the lead card.
  link: z.string().trim().url().max(400).optional(),
  // Uploaded CV file. A private-Blob URL set by the client-upload step before
  // submit (the file itself never passes through the JSON body). Optional.
  cvUrl: z.string().url().max(600).optional(),
  // Per-role screening answers (the role's screening questions, set in HQ).
  // Travels into HQ Lead.screeningAnswers and shows on the role's applicants.
  screeningAnswers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(40),
        label: z.string().trim().min(1).max(200),
        value: z.string().trim().max(4000),
      }),
    )
    .max(12)
    .optional(),
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
