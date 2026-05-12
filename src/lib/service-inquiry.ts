// Service inquiry — per-service-page lead capture. Higher-intent than a
// generic /contact submission because the visitor was looking at a
// specific service when they submitted, and the page slug travels with
// the record into HQ Inbox (LeadKind = SERVICE_INQUIRY, sourcePage =
// "/services/<slug>").
//
// HQ consumes these via /api/cron/sync-leads from the
// `service-inquiries/YYYY-MM.jsonl` Blob prefix. The shape here mirrors
// `RawServiceInquiryRecord` in gravixar-hq/src/lib/leads/marketing-blob.ts;
// keep the two in sync.

import { z } from "zod";

export const serviceInquirySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional(),
  // Free-form message — what's the problem, what would success look like.
  message: z.string().min(20).max(4000),
  // The service-page slug the visitor was on, e.g. "/services/ai-tooling".
  // Set by the form from the page context; not user-editable.
  sourcePage: z.string().min(1).max(120),
  // Honeypot, must be empty. Bots fill every input.
  website: z.string().max(0).optional(),
  // Optional UTM-ish tag, free-form, set by the form.
  source: z.string().max(80).optional(),
});

export type ServiceInquiry = z.infer<typeof serviceInquirySchema>;

export type ServiceInquiryRecord = ServiceInquiry & {
  id: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
};
