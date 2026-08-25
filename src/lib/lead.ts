// Lead capture validation + storage helpers.
//
// Capture path: POST /api/lead → validate → optional Resend notification
// → append to a Vercel Blob JSON line. Both side-effects are best-effort;
// a missing key just skips the corresponding step rather than failing the
// whole request.

import { z } from "zod";
import { teamSizeOptions } from "@/lib/early-access";

// The tools chip row on the contact form. Drawn from the /compare pages plus
// the stacks that actually show up in inbound notes; free strings on the wire
// so the list can grow without a schema change.
export const TOOL_OPTIONS = [
  "monday.com",
  "Notion",
  "ClickUp",
  "Asana",
  "Trello",
  "HubSpot",
  "Zoho",
  "Slack",
  "WhatsApp",
  "Google Sheets",
  "Airtable",
  "Something custom",
] as const;

export const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional(),
  // free-form: what brings them here
  message: z.string().min(20).max(4000),
  // which service they're after (helps qualify before the reply/call)
  service: z.string().max(120).optional(),
  // Optional qualifiers. Same teamSize vocabulary as the early-access form so
  // HQ triage reads one scale, not two; `tools` is what they run on today,
  // which pre-arms the discovery call (the /compare pages are the sales
  // surface for exactly these). Both must stay OPTIONAL and non-gating: the
  // form's job is the message, and an interrogation before first contact is
  // the pattern this site deliberately trades against.
  teamSize: z.enum(teamSizeOptions).optional(),
  tools: z.array(z.string().min(1).max(40)).max(12).optional(),
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
