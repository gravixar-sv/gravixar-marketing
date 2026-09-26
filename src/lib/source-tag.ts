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
// HQ reads `source` in two places, and a suffixed tag is safe for both:
// `sourcePageHref` only treats a domain-shaped source as a host (a colon never
// matches), and `isStudioLead` matches one exact Robonamix value this site
// never sends. Every lead schema caps `source` at 80 characters; the longest
// base here plus a 30-character suffix is 48.

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

/**
 * Reads how this visit arrived, once. Called on first paint by
 * <SourceCapture />, and lazily by sourceTag() as a fallback, so a form still
 * works on a route that somehow renders without the capture.
 */
export function rememberVisitSource(): void {
  if (typeof window === "undefined" || visitSuffix !== undefined) return;
  visitSuffix =
    tagFrom(window.location.search) ??
    referrerName(document.referrer, window.location.hostname);
}

export function sourceTag(base: string): string {
  if (typeof window === "undefined") return base;
  rememberVisitSource();
  const suffix = tagFrom(window.location.search) ?? visitSuffix ?? null;
  return suffix ? `${base}:${suffix}` : base;
}
