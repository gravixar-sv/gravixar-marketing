// MANDATE CLAUSE 1, the mechanical half. Bosun answers only from published
// content, and this file decides what "published" means field by field.
//
// The failure this prevents is not hypothetical and it is not loud. Somebody
// adds a frontmatter key months from now for an internal reason: a margin, an
// internal owner, a client's real name behind an anonymised case study, a note
// to self. If the pack builder walked frontmatter generically, that key would
// join Bosun's knowledge on the next deploy and nobody would notice until it
// came back out of the chat panel.
//
// So every key is classified, and an UNCLASSIFIED key throws. Two lists, not
// one, because "Bosun reads this" and "somebody looked at this and said no"
// are different statements and collapsing them loses the second. A new key is
// in neither list, so it fails the build with a message naming the file. That
// is the whole control: adding to Bosun's knowledge has to be a line in a diff
// a reviewer sees.

export type PackKind = "service" | "compare" | "module" | "caseStudy" | "page";

/** Frontmatter Bosun may read and may repeat verbatim. */
export const PACK_READ: Record<PackKind, readonly string[]> = {
  service: ["title", "slug", "tagline", "deliverables", "pricing", "bucket", "track"],
  compare: [
    "title",
    "slug",
    "competitor",
    "category",
    "summary",
    "hook",
    "whoForCompetitor",
    "whoForCustom",
    "faqs",
  ],
  module: ["title", "slug", "category", "summary", "stack"],
  caseStudy: [
    "title",
    "slug",
    "client",
    "role",
    "period",
    "summary",
    "problem",
    "approach",
    "outcome",
    "metrics",
    "stack",
  ],
  page: ["title", "description"],
};

/**
 * Considered and deliberately withheld. Each one has a reason, because a
 * silent exclusion is indistinguishable from an oversight six months later.
 */
export const PACK_EXCLUDED: Record<PackKind, readonly string[]> = {
  // proof/order/updatedAt: sort keys and a citation list. Bosun already links
  // to the service page, so the citation list would only give it more strings
  // to stitch together.
  service: ["proof", "order", "updatedAt"],
  compare: ["competitorUrl", "linkedCaseStudy", "linkedService", "publishedAt", "updatedAt", "draft"],
  // runningIn carries a `client` string per entry. The module pages publish it,
  // but a chat answer that volunteers who runs what is a different act from a
  // reader finding it on a page, and clause 6 says the case study `client:`
  // line is the ceiling. Withheld.
  module: ["runningIn", "publishedAt", "updatedAt", "order", "draft"],
  // cover is image alt text. Alt text has carried identifying detail before,
  // and Bosun has no reason to describe pictures.
  // demo: a link for the page to render. Bosun already routes people to /work
  // and /demos; pasting raw URLs into chat answers is a different act, and
  // promoting this to READ should be its own deliberate diff, not a side
  // effect of adding the field.
  // testimonial: a consented quote is published for the page it sits on. A
  // chat answer re-serving a named client's words in whatever context a
  // visitor conjures is a different act, same instinct as module runningIn,
  // and clause 6 keeps the client: line as the ceiling.
  caseStudy: ["cover", "publishedAt", "draft", "demo", "testimonial"],
  page: ["eyebrow"],
};

/**
 * Throws on any key classified in neither list. Called by the pack builder for
 * every item, and again by prebuild so the failure is a red build rather than
 * a red request.
 */
export function assertClassified(
  kind: PackKind,
  frontmatter: Record<string, unknown>,
  file: string,
): void {
  const known = new Set<string>([...PACK_READ[kind], ...PACK_EXCLUDED[kind]]);
  const unknown = Object.keys(frontmatter).filter((k) => !known.has(k));
  if (unknown.length === 0) return;

  throw new Error(
    [
      `[chat-pack] ${file}`,
      `  Unclassified frontmatter key(s) for Bosun: ${unknown.join(", ")}`,
      ``,
      `  Bosun answers from published content only, and every field has to be`,
      `  classified before it ships. A new key is not automatically safe to say`,
      `  out loud, so this fails the build rather than guessing.`,
      ``,
      `  In src/lib/chat/pack-allowlist.ts, add each key to either:`,
      `    PACK_READ.${kind}      Bosun may repeat it verbatim`,
      `    PACK_EXCLUDED.${kind}  considered, withheld, with the reason in a comment`,
    ].join("\n"),
  );
}

/** Keeps only readable keys. Runs after assertClassified, belt and braces. */
export function pickReadable<T extends Record<string, unknown>>(
  kind: PackKind,
  frontmatter: T,
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of PACK_READ[kind]) {
    if (key in frontmatter) out[key] = frontmatter[key];
  }
  return out as Partial<T>;
}
