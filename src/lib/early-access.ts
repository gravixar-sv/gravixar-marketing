// Early-access waitlist signup. Same shape as the lead capture but with
// a much smaller required surface: email is the only must, everything
// else is optional context. Stored in a separate Blob log keyed by month
// so the early-access list doesn't get tangled with discovery-call leads.
//
// Structured fields (interest / teamSize / timeline) added 2026-05-05 to
// give Qamar enough triage signal without forcing visitors to write a
// long free-text answer. The dropdown values map 1:1 to the SaaS
// roadmap: each option is a real module shipping or about to ship.

import { z } from "zod";

export const interestOptions = [
  "agentic-email",
  "client-portal",
  "ai-intake-wizard",
  "audit-log-restore",
  "review-state-machine",
  "ops-consulting",
  "brand-visuals",
  "fbr-payroll",
  "other",
] as const;

export const teamSizeOptions = [
  "solo",
  "2-10",
  "11-50",
  "50+",
] as const;

export const timelineOptions = [
  "this-week",
  "this-month",
  "this-quarter",
  "exploring",
] as const;

export const earlyAccessSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  // Primary interest — drives Qamar's triage. Maps to a module in the
  // /modules library. "other" is the catch-all; the free-text `need`
  // field captures the specific shape.
  interest: z.enum(interestOptions).optional(),
  // Team size, optional. Helps with sizing the right tier (Starter /
  // Pro / Concierge).
  teamSize: z.enum(teamSizeOptions).optional(),
  // How urgent — separates "ready to buy" from "just curious."
  timeline: z.enum(timelineOptions).optional(),
  // Free-form one-liner: anything else they want to share. Optional;
  // supplements the structured fields above.
  need: z.string().max(600).optional(),
  // Optional UTM-ish source, set by the form on the page it came from.
  source: z.string().max(80).optional(),
  // Honeypot, must be empty. Bots fill every input.
  website: z.string().max(0).optional(),
});

export type EarlyAccessSignup = z.infer<typeof earlyAccessSchema>;

export type EarlyAccessRecord = EarlyAccessSignup & {
  id: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
};

// Display labels for the structured fields, used by both the form UI
// and the notification email body.
export const INTEREST_LABELS: Record<(typeof interestOptions)[number], string> = {
  "agentic-email": "Agentic email (drafts and sequences with human approval)",
  "client-portal": "Hosted client portal (review state machine, audit log)",
  "ai-intake-wizard": "AI intake wizard (adaptive questions, brand brief from URL)",
  "audit-log-restore": "Audit log + safe-restore (compliance-grade retention)",
  "review-state-machine": "Review state machine (deliverable approval flow)",
  "ops-consulting": "Operations consulting (custom build, not hosted)",
  "brand-visuals": "Brand and visual work (identity, motion, decks)",
  "fbr-payroll": "Pakistan FBR + EOBI payroll engine",
  other: "Something else, I'll describe below",
};

export const TEAM_SIZE_LABELS: Record<(typeof teamSizeOptions)[number], string> = {
  solo: "Just me",
  "2-10": "2 to 10 people",
  "11-50": "11 to 50 people",
  "50+": "50+ people",
};

export const TIMELINE_LABELS: Record<(typeof timelineOptions)[number], string> = {
  "this-week": "This week, urgent",
  "this-month": "This month",
  "this-quarter": "This quarter",
  exploring: "Just exploring",
};
