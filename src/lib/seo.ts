import type { Metadata } from "next";
import { env } from "./env";

export const SITE = {
  name: "Gravixar",
  tagline: "Operations systems, brand work, AI tooling. Running before we talk.",
  url: env.NEXT_PUBLIC_SITE_URL,
  author: "Qamar",
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
