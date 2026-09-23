// Client-safe service options, shared by the booking + contact forms.
// Kept separate from booking.ts (which imports node:crypto and must not
// reach the client bundle).
//
// The VALUES are stored on every lead and booking and read by HQ triage, so
// they never change. What a visitor reads is SERVICE_LABELS: the internal
// service names ("Operations infrastructure") are the builder's words, and a
// dropdown option is read in the visitor's own voice.

export const SERVICE_OPTIONS = [
  "Operations infrastructure",
  "AI tooling & automations",
  "Brand & visuals",
  "Not sure yet",
] as const;

export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const SERVICE_LABELS: Record<ServiceOption, string> = {
  "Operations infrastructure": "A system to run my operations",
  "AI tooling & automations": "AI that does work for my team",
  "Brand & visuals": "Brand and visuals",
  "Not sure yet": "Not sure yet",
};
