// The UTM-ish `source` tag a lead carries into HQ Inbox.
//
// Every form used to send a constant ("service-page", "contact-page"), so a
// buyer who arrived from a LinkedIn post landed in HQ looking exactly like one
// who found the site any other way, and outbound could not be told apart from
// everything else. The form still names itself; when the page the visitor is
// on carries a `utm_source` or `src` query parameter, it is appended:
// "service-page:linkedin".
//
// Read from the current URL at submit time and nothing else. Nothing is
// stored, so there is no cookie or storage question to answer, and the cost is
// that a visitor who lands with the parameter and then navigates away before
// submitting loses it. Links from LinkedIn should therefore point straight at a
// page with a form (a service page, /contact).
//
// HQ reads `source` in two places, and a suffixed tag is safe for both:
// `sourcePageHref` only treats a domain-shaped source as a host (a colon never
// matches), and `isStudioLead` matches one exact Robonamix value this site
// never sends. Every lead schema caps `source` at 80 characters; the longest
// base here plus a 30-character suffix is 48.

const MAX_SUFFIX = 30;

export function sourceTag(base: string): string {
  if (typeof window === "undefined") return base;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("utm_source") ?? params.get("src");
  if (!raw) return base;
  const suffix = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, MAX_SUFFIX);
  return suffix ? `${base}:${suffix}` : base;
}
