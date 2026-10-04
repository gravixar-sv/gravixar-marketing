import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// AI answer engines are explicitly welcomed: being cited in ChatGPT / Claude /
// Perplexity / Google AI Overviews is distribution for a public marketing site,
// not a leak (gravixar-discoverability-social-alerts-stack, item 2). The wildcard
// already allows them; listing them is explicit intent + future-proofs against a
// stricter default.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    // No `host`. It printed "Host: https://gravixar.com", a Yandex-only
    // directive that Google ignores and that expects a bare host, not a URL.
    // The canonical host is enforced where it counts: the www and
    // .vercel.app 308s in next.config.ts and the canonical tag on every page.
  };
}
