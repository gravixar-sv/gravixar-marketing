import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { StructuredDataGlobal } from "@/components/site/StructuredData";
import { SITE } from "@/lib/seo";
import "@/styles/globals.css";

// Root layout — the bare-bones shell for every route. Marketing chrome
// (DemoBanner, Navbar, Footer, main wrapper) lives in (marketing)/layout.tsx
// so admin and other non-marketing routes don't inherit it.
//
// next/font self-hosts the font files (no Google CDN call), bakes in
// font-display: swap, subsets to latin, and emits a CSS variable that
// our Tailwind theme reads. Geist is Vercel's typeface, designed for
// technical/agency interfaces — tighter terminals, cleaner numerals
// than Inter, no rounded humanist warmth that reads consumer-marketing.
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description:
    "Operations infrastructure, brand work, and AI tooling for teams that want what they're buying running before the contract. Production portals, intake wizards, content agents.",
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.url }],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <StructuredDataGlobal />
      </head>
      <body className="bg-[#0a0a0a] text-[#fafafa]">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
