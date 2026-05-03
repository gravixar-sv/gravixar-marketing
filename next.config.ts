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
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      { source: "/services/operations", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/services/ai", destination: "/services/ai-tooling", permanent: true },
      { source: "/services/brand", destination: "/services/brand-visuals", permanent: true },
      // Legacy slugs from the v0.1 4-bucket draft
      { source: "/services/people", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/services/people-ops", destination: "/services/operations-infrastructure", permanent: true },
      { source: "/services/ai-augmented-work", destination: "/services/ai-tooling", permanent: true },
      { source: "/services/graphics", destination: "/services/brand-visuals", permanent: true },
    ];
  },
};

export default withBotId(nextConfig);
