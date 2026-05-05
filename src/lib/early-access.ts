// Early-access waitlist signup. Same shape as the lead capture but with
// a much smaller required surface: email is the only must, everything
// else is optional context. Stored in a separate Blob log keyed by month
// so the early-access list doesn't get tangled with discovery-call leads.

import { z } from "zod";

export const earlyAccessSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  // free-form one-liner: what brings them here, what they're hoping to use
  need: z.string().max(600).optional(),
  // optional UTM-ish source
  source: z.string().max(80).optional(),
  // honeypot, must be empty. Bots fill every input.
  website: z.string().max(0).optional(),
});

export type EarlyAccessSignup = z.infer<typeof earlyAccessSchema>;

export type EarlyAccessRecord = EarlyAccessSignup & {
  id: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
};
