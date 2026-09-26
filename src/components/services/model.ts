import type { Service } from "@/content/schema";

// Everything the service templates derive from a service's frontmatter, kept
// in one place so the index, the detail page and the closing panel say the
// same thing about the same offer.

export type Track = Service["track"];

// The track in plain words. The index labels its groups with these and each
// detail page uses the same words as its back-link eyebrow, so a visitor sees
// where an offer sits on the path before reading anything else.
//
// "ongoing" has to be true of both offers in it: the retainer that watches a
// system after launch, and the code review that happens before an investor
// reads the code. "After it ships" sat directly above a lede that opens with
// "before", so the label names the state both share instead of a moment.
export const TRACK_LABEL: Record<Track, string> = {
  start: "Where to start",
  build: "What I build",
  ongoing: "Once it is running",
  maintain: "Keeping it running",
};

export type Term = { label: string; value: string };

// The terms strip under each service title: the price and the timeline split
// into two or three short facts a buyer can scan. Hand-written because the
// pricing lines are prose, but GUARDED: every figure in a term must also sit
// in that service's pricing line (see termsFor), so if a price moves in the
// MDX and nobody updates this map, the strip falls back to the pricing line
// verbatim instead of showing a stale number.
//
// "I see" is glued with a non-breaking space so a line can never end on a
// lone "I" ("Priced once I / see the scope"), the fix ContactCTA already uses.
const TERMS: Record<string, Term[]> = {
  "ops-leak-audit": [
    { label: "Price", value: "$3,500 fixed" },
    { label: "Covers", value: "One team and its costliest workflows" },
    { label: "Report", value: "About two weeks after kickoff" },
  ],
  "operations-infrastructure": [
    { label: "Fixed price", value: "$28,000 to $55,000" },
    { label: "Timeline", value: "Typically 4 to 10 weeks" },
    { label: "Price agreed", value: "Before the build starts" },
  ],
  "ai-tooling": [
    { label: "Price", value: "Priced once I see the scope" },
    { label: "First build", value: "Usually 2 to 4 weeks" },
  ],
  "fractional-ai-ops-lead": [
    { label: "One system", value: "$3,500 a month" },
    { label: "Timing", value: "Starts when the build ships" },
    { label: "More than one", value: "Priced per system" },
  ],
  "system-audit": [
    { label: "Price", value: "$6,500 fixed" },
    { label: "Covers", value: "One codebase" },
    { label: "Scope", value: "Agreed in writing first" },
  ],
  "managed-services": [
    { label: "Billing", value: "Monthly retainer" },
    { label: "Levels", value: "Full stack, or maintenance only" },
    { label: "Price", value: "Scoped after I see what you run" },
  ],
  "brand-visuals": [
    { label: "Price", value: "Per project" },
    { label: "Typical week", value: "Brief Monday, options Wednesday, finished Friday" },
  ],
};

// "55,000" and "55,000," are the same figure: a trailing comma is punctuation.
const digitRuns = (s: string) => s.match(/\d+(?:,\d{3})*/g) ?? [];

export function termsFor(meta: Service): Term[] {
  const pricing = meta.pricing ?? "";
  const mapped = TERMS[meta.slug];
  if (mapped) {
    const published = new Set(digitRuns(pricing));
    const stale = mapped.some((t) => digitRuns(t.value).some((n) => !published.has(n)));
    if (!stale) return mapped;
  }
  return pricing ? [{ label: "Price", value: pricing }] : [];
}

// How the price is paid, shown in the closing panel beside the form and not in
// the header strip, which stays at three facts. Added 2026-09-26: the audit's
// button asked for a start date while the page said nothing about paying.
// Guarded like TERMS: a row whose figures the pricing line does not carry is
// dropped rather than shown stale.
const DEAL: Record<string, Term[]> = {
  "ops-leak-audit": [
    { label: "Payment", value: "Half to book, half after the readout, if it was useful" },
    { label: "Credit", value: "The fee comes off a build started within 90 days" },
  ],
};

export function dealFor(meta: Service): Term[] {
  const published = new Set(digitRuns(meta.pricing ?? ""));
  return (DEAL[meta.slug] ?? []).filter((t) => digitRuns(t.value).every((n) => published.has(n)));
}

/** The headline figure for the index's front door, e.g. "$3,500". */
export function leadFigure(meta: Service): { figure: string; qualifier?: string } | null {
  const m = meta.pricing?.match(/^\$\d+(?:,\d{3})*/);
  if (!m) return null;
  const rest = meta.pricing!.slice(m[0].length);
  return { figure: m[0], qualifier: /^\s*fixed\b/i.test(rest) ? "fixed" : undefined };
}

export function primaryCta(meta: Service): string {
  return meta.track === "start" ? `Start the ${meta.title}` : "Talk to me about this";
}

// The closing panel's heading. The start track is bought, not discussed, so it
// names the purchase. Everything else asks one plain question in the buyer's
// words; the old template lowercased the title into it and printed "your ai
// code confidence review problem" on six pages.
const CLOSING_ASK: Record<string, string> = {
  "operations-infrastructure": "Tell me how work moves today.",
  "ai-tooling": "Tell me which job you want off your plate.",
  "fractional-ai-ops-lead": "Tell me what is running and what it touches.",
  "system-audit": "Tell me what the code does and who will read it.",
  "managed-services": "Tell me what your site runs on.",
  "brand-visuals": "Tell me what you need made.",
};

export function closingHeading(meta: Service): string {
  if (meta.track === "start") return `Start the ${meta.title}.`;
  return CLOSING_ASK[meta.slug] ?? "Tell me what you are trying to fix.";
}

// One sentence, one promise. No routing jargon: the visitor does not need to
// know which inbox it lands in, or that the page travels with the note.
export function closingLine(meta: Service): string {
  return meta.track === "start"
    ? "Tell me how big the team is and which tools it runs on, and I reply within 24 hours to confirm the scope and a start date."
    : "Send a few lines about where things stand. I reply within 24 hours.";
}

// The closing form's prompt, where the generic one asks the wrong questions.
// "What is broken" and "your team size and tools" fit a portal or an AI build;
// they do not fit a logo, a deck or a hosting account. Anything not listed
// keeps the form's default.
const MESSAGE_PLACEHOLDER: Record<string, string> = {
  "brand-visuals": "What you need made, where it will be used, and when you need it.",
  "managed-services": "What your site runs on, who hosts it, and what keeps going wrong.",
};

export function messagePlaceholder(meta: Service): string | undefined {
  return MESSAGE_PLACEHOLDER[meta.slug];
}

export type ProofKind = Service["proof"][number]["kind"];

/** Human label for a proof row. An on-site artifact reads as what it is. */
export function proofLabel(kind: ProofKind, href: string): string {
  if (kind === "case-study") return "Case study";
  if (kind === "external") return "External";
  return /^https?:\/\//.test(href) ? "Live demo" : "Live on this site";
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}
