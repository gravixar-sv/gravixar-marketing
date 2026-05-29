// Client-safe service options, shared by the booking + contact forms.
// Kept separate from booking.ts (which imports node:crypto and must not
// reach the client bundle).

export const SERVICE_OPTIONS = [
  "Operations infrastructure",
  "AI tooling & automations",
  "Brand & visuals",
  "Not sure yet",
] as const;

export type ServiceOption = (typeof SERVICE_OPTIONS)[number];
