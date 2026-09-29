// Build-time gate for the security headers. Runs in prebuild.
//
// next.config.ts used to hand-write its header list. On 2026-09-29 it moved
// to @gravixar-sv/core/headers' buildHeaders(). The move was meant to change
// nothing on the wire, and this proves it: the headers the config emits now,
// through withBotId, must serialise to exactly the same bytes as the old list
// run through the same wrapper. Same headers, same order, same values.
//
// The LEGACY block below is next.config.ts lines 4-33 as of 00adb78, copied
// verbatim, serialiser included, so the expected value does not depend on
// core's serialiser. Do not "tidy" it. If the site's header policy changes on
// purpose, change the policy in next.config.ts and update LEGACY in the same
// commit, so the diff shows the header change for review.

import { withBotId } from "botid/next/config";
import nextConfig from "../next.config";

/* ---- LEGACY: verbatim from next.config.ts @ 00adb78 ---------------------- */
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
/* ---- end LEGACY ---------------------------------------------------------- */

// The CSP as a literal, so a change to the legacy serialiser above cannot
// quietly move the target too.
const CSP_LITERAL =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://cal.com https://app.cal.com https://va.vercel-scripts.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com; " +
  "frame-src 'self' https://cal.com https://app.cal.com; " +
  "connect-src 'self' https://*.public.blob.vercel-storage.com https://vitals.vercel-insights.com; " +
  "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; " +
  "upgrade-insecure-requests";

const failures: string[] = [];
function check(ok: boolean, name: string, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    if (detail !== undefined) console.log(`      ${JSON.stringify(detail)}`);
    failures.push(name);
  }
}

type Rule = { source: string; headers: { key: string; value: string }[] };

async function main() {
  const legacyConfig = withBotId({
    async headers() {
      return [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
  });

  const now = (await nextConfig.headers!()) as Rule[];
  const before = (await legacyConfig.headers!()) as Rule[];

  check(CSP_HEADER === CSP_LITERAL, "legacy CSP serialises to the pinned literal");

  const site = now.find((r) => r.source === "/:path*");
  check(Boolean(site), "a /:path* rule is emitted");
  const got = site?.headers ?? [];
  check(
    got.map((h) => h.key).join("|") === SECURITY_HEADERS.map((h) => h.key).join("|"),
    "same header names in the same order",
    got.map((h) => h.key),
  );
  for (const want of SECURITY_HEADERS) {
    const have = got.find((h) => h.key === want.key);
    check(have?.value === want.value, `${want.key}: byte-identical`, { want: want.value, got: have?.value });
  }

  // The whole emitted list, BotID's own rule included, as bytes.
  const a = JSON.stringify(now);
  const b = JSON.stringify(before);
  check(a === b, `full headers() output byte-identical (${a.length} bytes)`, a === b ? undefined : { now: a, before: b });

  if (failures.length > 0) {
    console.error(`\nheaders parity selftest: ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\nheaders parity selftest: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
