import type { Module } from "@/content/schema";

// Category headings for /modules, in people's words. Keyed off the schema enum,
// so a new category without a label is a type error instead of a raw slug
// leaking onto the page.
export const MODULE_CATEGORY_LABELS: Record<Module["category"], string> = {
  auth: "Sign-in and access",
  audit: "Audit and records",
  ai: "AI with guardrails",
  finance: "Finance",
  ops: "Operations",
  comms: "Communications",
};
