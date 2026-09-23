// Page-level reshaping of a service's MDX body. The MDX stays the single
// source of truth (Bosun, llms.txt and the SEO agent read the same files), and
// the template moves pieces of it to where they read best.

export type Pairing = { title: string; href: string; reason: string };

// Every service body ends with a "Pairs with **[Title](/services/x)** when
// ..." paragraph. In the article it read like a sitemap and made the page end
// on a list of links instead of its strongest line, so the template lifts it
// into the aside as "Often paired with" and renders the rest of the body.
//
// Fails safe: a body whose last paragraph is not that shape, or that yields no
// links, is returned untouched and the aside simply has no pairings block.
export function extractPairings(body: string): { body: string; pairings: Pairing[] } {
  const paras = body.trimEnd().split(/\n\s*\n/);
  const last = paras[paras.length - 1]?.trim() ?? "";
  if (!/^Pairs with\b/.test(last)) return { body, pairings: [] };

  const pairings: Pairing[] = [];
  for (const m of last.matchAll(/\*\*\[([^\]]+)\]\(([^)\s]+)\)\*\*\s*([^*]*)/g)) {
    const reason = (m[3] ?? "")
      .replace(/,?\s*(?:and\s+)?with\s*$/i, "")
      .replace(/[\s.,;]+$/, "")
      .trim();
    pairings.push({
      title: m[1] ?? "",
      href: m[2] ?? "",
      reason: reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : "",
    });
  }
  if (pairings.length === 0) return { body, pairings: [] };
  return { body: paras.slice(0, -1).join("\n\n"), pairings };
}

// A body can mark where the template should place a component between two
// runs of prose, with an MDX comment: {/* facts-ledger */} or
// {/* demo-shot */}. The body comes back as runs of MDX with the markers
// between them, in order. Unmarked bodies come back as a single run, and an
// unknown comment is left in the MDX (where it renders nothing), so a marker is
// always optional and a typo in one costs a component, never the page.
export type BodyPart = { kind: "mdx"; source: string } | { kind: "marker"; name: string };

export function splitAtMarkers(body: string, names: readonly string[]): BodyPart[] {
  if (names.length === 0) return [{ kind: "mdx", source: body }];
  const alt = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`\\{\\/\\*\\s*(${alt})\\b[\\s\\S]*?\\*\\/\\}`, "g");
  const parts: BodyPart[] = [];
  let at = 0;
  for (const m of body.matchAll(re)) {
    const run = body.slice(at, m.index).trim();
    if (run) parts.push({ kind: "mdx", source: run });
    parts.push({ kind: "marker", name: m[1] ?? "" });
    at = (m.index ?? 0) + m[0].length;
  }
  const tail = body.slice(at).trim();
  if (tail) parts.push({ kind: "mdx", source: tail });
  return parts;
}
