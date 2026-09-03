import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src":   ["'self'"],
  "script-src":    ["'self'", "'unsafe-inline'", "https://cal.com", "https://app.cal.com", "https://va.vercel-scripts.com"],
  "style-src":     ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src":      ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src":       ["'self'", "data:", "blob:", "https://*.public.blob.vercel-storage.com"],
  "frame-src":     ["'self'", "https://cal.com", "https://app.cal.com"],
  "connect-src":   ["'self'", "https://*.public.blob.vercel-storage.com", "https://vitals.vercel-insights.com"],
  "object-src":    ["'none'"],
  "base-uri":      ["'self'"],
  "form-action":   ["'self'"],
  "frame-ancestors": ["'none'"],
  "upgrade-insecure-requests": [],
};

const CSP_HEADER = Object.entries(CSP_DIRECTIVES)
  .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
  .join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control",    value: "off" },
  { key: "Content-Security-Policy",   value: CSP_HEADER },
  { key: "Access-Control-Allow-Origin", value: "https://gravixar.com" },
  { key: "Vary",                        value: "Origin" },
];

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Same-document view transitions for client-side navigation. The CSS-only
    // @view-transition rule is not an option here: it only fires cross-document,
    // and the App Router navigates in-document, so it would animate nothing.
    // Checked before enabling: this flag does NOT move the app onto the
    // experimental React channel (needs-experimental-react.js gates that on
    // taint, transitionIndicator and gestureTransition, not on this), and the
    // flag alone is inert. It emits nothing until something wraps a subtree,
    // which is exactly one place: <main> in the marketing layout. See the
    // comment there for why the placement is load-bearing, and globals.css for
    // the reduced-motion guard.
    viewTransition: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // Canonical host: redirect www.gravixar.com -> gravixar.com (the canonical
      // set in SITE.url). Without this, www served a duplicate 200 and Bing
      // refused to index the www pages ("page is a redirect" via the non-www
      // canonical). One host, one set of ranking signals.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.gravixar.com" }],
        destination: "https://gravixar.com/:path*",
        permanent: true,
      },
      // Canonical host: the auto-generated Vercel production alias
      // (gravixar-marketing.vercel.app) served a full, indexable 200 — a
      // duplicate of gravixar.com that Bing indexed under "gravixar". 308 it
      // to the canonical domain so search consolidates on gravixar.com and
      // any stray link lands on the brand. Scoped to the EXACT production
      // alias: preview hosts (gravixar-marketing-git-main-… / -<hash>-…) are
      // longer, don't match this anchored host, and stay reachable (Vercel
      // already serves them noindex).
      {
        source: "/:path*",
        has: [{ type: "host", value: "gravixar-marketing.vercel.app" }],
        destination: "https://gravixar.com/:path*",
        permanent: true,
      },
      // Retired 2026-09-02. /work/healthcare-billing-credentialing and
      // /work/beeline were the SAME engagement published as two clients,
      // carrying identical figures (250 clients, 2,042 panels, 83,665 OIG
      // rows). Operator confirmed they are both Beeline. The two pages were
      // not contradictory, they described the same boundary from two sides,
      // so the surviving page absorbs the no-PHI posture rather than dropping
      // it. 301 because the retired URL has been live and indexed since
      // 2026-06-26.
      { source: "/work/healthcare-billing-credentialing", destination: "/work/beeline", permanent: true },
      { source: "/services/operations", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/services/ai", destination: "/services/ai-tooling", permanent: true },
      { source: "/services/brand", destination: "/services/brand-visuals", permanent: true },
      // Legacy slugs from the v0.1 4-bucket draft
      { source: "/services/people", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/services/people-ops", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/services/ai-augmented-work", destination: "/services/ai-tooling", permanent: true },
      { source: "/services/graphics", destination: "/services/brand-visuals", permanent: true },
      // Legacy WordPress URLs from before the Next.js migration. These returned
      // 404 after the rebuild while Google still had them indexed (confirmed
      // 2026-06-09: /about-us, /what-we-do, /web-development, /contact-us all
      // 404'd). 301 each to the nearest current page so crawl equity transfers
      // instead of dead-ending. Extend this list from Search Console's "Pages"
      // report once the property is verified and the full legacy set is known.
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/what-we-do", destination: "/services", permanent: true },
      { source: "/web-development", destination: "/services", permanent: true },
      { source: "/content-creation", destination: "/services/brand-visuals", permanent: true },
      { source: "/hr-services", destination: "/services", permanent: true },
      { source: "/operations-consulting", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      // Round 2: legacy URLs from the GSC "Not found (404)" report (2026-06-09).
      // Old WordPress careers/jobs taxonomy, case studies, and landing pages.
      // WordPress internals (/wp-content/*, /wp-*.php, /comments/feed, date
      // archives, hello-world) are deliberately NOT redirected -- they are dead,
      // not moved, so a 404 is the correct, honest response.
      { source: "/home", destination: "/", permanent: true },
      { source: "/inquiry", destination: "/contact", permanent: true },
      { source: "/case-studies", destination: "/work", permanent: true },
      { source: "/case-study-monday", destination: "/work/monday-rollout-agency", permanent: true },
      { source: "/case-study-lucidlink-wasabi", destination: "/work/lucidlink-wasabi", permanent: true },
      // Old hiring funnel (WordPress) -> the new /careers funnel
      { source: "/apply", destination: "/careers", permanent: true },
      { source: "/jobs", destination: "/careers", permanent: true },
      { source: "/jobs/:path*", destination: "/careers", permanent: true },
      { source: "/open-roles", destination: "/careers", permanent: true },
      { source: "/open-roles/:path*", destination: "/careers", permanent: true },
      { source: "/job-department/:path*", destination: "/careers", permanent: true },
      // /admin deprecated 2026-05-11. Lead triage moved to HQ's unified
      // inbox when Phase 5 of gravixar-hq shipped. Marketing still writes
      // the JSONL blobs on form submit (no change there); HQ polls every
      // 15 min and triages. Kept temporary (307) so we can roll back if
      // HQ has issues; promote to permanent (308) once HQ is stable.
      { source: "/admin", destination: "https://hq.gravixar.com/inbox", permanent: false },
      { source: "/admin/:path*", destination: "https://hq.gravixar.com/inbox", permanent: false },
    ];
  },
};

export default withBotId(nextConfig);
