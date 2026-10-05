// The UTM-ish `source` tag a lead carries into HQ Inbox.
//
// Every form used to send a constant ("service-page", "contact-page"), so a
// buyer who arrived from a LinkedIn post landed in HQ looking exactly like one
// who found the site any other way, and outbound could not be told apart from
// everything else. The form still names itself; when the visit carries a
// channel, it is appended: "service-page:linkedin".
//
// Where the channel comes from, in order:
//   1. a `utm_source` or `src` query parameter on the current page;
//   2. the same parameter on the page the visit started on;
//   3. the site that sent the visit, named in the same words a tagged link
//      would use. A click from a LinkedIn profile, an AI answer or the demo
//      carries no tag, and those were exactly the visits that went unnamed.
//
// Nothing is written to the device: no cookie, no storage. The start of the
// visit is held in memory by <SourceCapture />, so it survives the in-site
// navigation that used to lose it (land on a service page, click through to
// /contact, submit) and is gone on reload. The privacy page says what this
// records.
//
// The post, too (2026-10-05). A tagged link in a LinkedIn first comment
// carries `utm_content=<the HQ post's id>`, and when it does the id rides
// after the channel: "contact-page:linkedin:<id>". HQ reads it back off the
// end (src/lib/social/attribution.ts in gravixar-hq) to count leads per post,
// which "linkedin" alone could not: three posts a week share that channel. It
// rides only with the channel it was tagged with, so a later visit from
// somewhere else never inherits it.
//
// HQ reads `source` in three places, and a suffixed tag is safe for all of
// them: `sourcePageHref` only treats a domain-shaped source as a host (a colon
// never matches), `isStudioLead` matches one exact Robonamix value this site
// never sends, and the post reader only acts on a last segment shaped exactly
// like an HQ draft id. Every lead schema caps `source` at 80 characters; the
// longest base here (17) plus a 30-character channel and a 30-character
// content, with their colons, is 79.

const MAX_SUFFIX = 30;

// First match wins, so gemini.google.com is named before Google search.
const REFERRER_NAMES: ReadonlyArray<readonly [RegExp, string]> = [
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/^gemini\.google\.com$/, "gemini"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(x|twitter)\.com$|^t\.co$/, "x"],
  [/(^|\.)(facebook|instagram)\.com$/, "meta"],
  [/^demo\.gravixar\.com$/, "demo"],
];

function clean(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, MAX_SUFFIX);
}

function tagFrom(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get("utm_source") ?? params.get("src");
  return raw ? clean(raw) || null : null;
}

/** The `utm_content` on a URL, cleaned like the channel, or null. */
export function contentFrom(search: string): string | null {
  const raw = new URLSearchParams(search).get("utm_content");
  return raw ? clean(raw) || null : null;
}

/** The tag itself, given what the visit said. Pure, so every case is fixtured. */
export function composeTag(base: string, channel: string | null, content: string | null): string {
  if (!channel) return base;
  return content ? `${base}:${channel}:${content}` : `${base}:${channel}`;
}

/** The referring site as a channel name, or null for a direct or in-site visit. */
export function referrerName(referrer: string, ownHost: string): string | null {
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  const bare = host.replace(/^www\./, "");
  if (!bare || bare === ownHost.toLowerCase().replace(/^www\./, "")) return null;
  for (const [pattern, name] of REFERRER_NAMES) {
    if (pattern.test(bare)) return name;
  }
  return clean(bare.replace(/\./g, "-")) || null;
}

// undefined until the visit has been read; null once read and found untagged.
let visitSuffix: string | null | undefined;
// The landing page's utm_content, kept beside the channel it came with.
let visitContent: string | null = null;

/**
 * Reads how this visit arrived, once. Called on first paint by
 * <SourceCapture />, and lazily by sourceTag() as a fallback, so a form still
 * works on a route that somehow renders without the capture.
 */
export function rememberVisitSource(): void {
  if (typeof window === "undefined" || visitSuffix !== undefined) return;
  const tagged = tagFrom(window.location.search);
  visitSuffix = tagged ?? referrerName(document.referrer, window.location.hostname);
  // Only a tagged landing has content worth keeping: a referrer-named visit
  // was never given one.
  visitContent = tagged ? contentFrom(window.location.search) : null;
}

export function sourceTag(base: string): string {
  if (typeof window === "undefined") return base;
  rememberVisitSource();
  const here = tagFrom(window.location.search);
  if (here) return composeTag(base, here, contentFrom(window.location.search));
  return composeTag(base, visitSuffix ?? null, visitContent);
}
