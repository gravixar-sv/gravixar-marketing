import type { Metadata } from "next";
import { env } from "./env";

export const SITE = {
  name: "Gravixar",
  tagline: "The AI-ops platform that runs your operations, with a human on every approval.",
  url: env.NEXT_PUBLIC_SITE_URL,
  // FULL legal name, not the mononym the site uses in prose. This string is
  // never rendered as body copy: its five consumers are all machine-readable
  // author fields (root layout `authors`, Person JSON-LD `name`, Organization
  // `founder.name`, and the Article/BlogPosting author on the two detail
  // routes). A mononym cannot be an entity. It does not disambiguate, it
  // cannot be searched for, and nothing an answer engine reads off this site
  // could tie a mention elsewhere back to the person who wrote it. Keep the
  // warm "Qamar" in the visible copy and let the schema carry the full name.
  author: "Qamar Abbas",
  twitter: "@gravixar",
  // Live demo target. demo.gravixar.com went live 2026-05-05 via
  // Vercel nameservers. The .vercel.app fallback URL still works,
  // but we use the custom domain in production for brand consistency.
  demoUrl: "https://demo.gravixar.com",
} as const;

export function buildMetadata({
  title,
  description,
  path = "/",
  ogImage,
  ogKind,
}: {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogKind?: string;
}): Metadata {
  const canonical = new URL(path, SITE.url).toString();
  // When no static cover is provided, fall through to the dynamic OG
  // endpoint. ImageResponse renders a branded card from the title + kind.
  const og =
    ogImage ??
    `/api/og?title=${encodeURIComponent(title)}${ogKind ? `&kind=${encodeURIComponent(ogKind)}` : ""}`;
  return {
    title,
    description,
    metadataBase: new URL(SITE.url),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE.name,
      type: "website",
      images: [{ url: og }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
    robots: { index: true, follow: true },
  };
}
