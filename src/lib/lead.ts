// Lead capture validation + storage helpers.
//
// Capture path: POST /api/lead → validate → optional Resend notification
// → append to a Vercel Blob JSON line. Both side-effects are best-effort;
// a missing key just skips the corresponding step rather than failing the
// whole request.

import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional(),
  // free-form: what brings them here
  message: z.string().min(20).max(4000),
  // which service they're after (helps qualify before the reply/call)
  service: z.string().max(120).optional(),
  // honeypot, must be empty. Bots fill every input.
  website: z.string().max(0).optional(),
  // optional, helps qualify
  source: z.string().max(80).optional(),
});

export type Lead = z.infer<typeof leadSchema>;

export type LeadRecord = Lead & {
  id: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
};
