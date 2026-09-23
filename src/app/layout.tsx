import type { Metadata, Viewport } from "next";
import { Geist_Mono, Newsreader } from "next/font/google";
// Mona Sans with its width axis (wght 200-900, wdth 75-125), so display sizes
// can run slightly condensed. Hubot Sans was retired 2026-09-23: its capital
// I carries slab serifs, which read as a fallback glyph in every first-person
// heading on a site written as "I".
import "@fontsource-variable/mona-sans/wdth.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { StructuredDataGlobal } from "@/components/site/StructuredData";
import { SITE } from "@/lib/seo";
import "@/styles/globals.css";

// Root layout, the bare-bones shell for every route. Marketing chrome
// (DemoBanner, Navbar, Footer, main wrapper) lives in (marketing)/layout.tsx
// so admin and other non-marketing routes don't inherit it.
//
// Three voices, one job each: Mona Sans is the brand (self-hosted via
// @fontsource-variable), Geist Mono is machine output (URLs, timestamps,
// status), and Newsreader italic is the human voice, used for one phrase per
// page at most. next/font self-hosts the two Google faces.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-newsreader",
  display: "swap",
  // Not preloaded: it is an accent, never the LCP text, and most routes set
  // at most one phrase in it.
  preload: false,
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} · AI-ops platform with a human on every approval`, template: `%s · ${SITE.name}` },
  description:
    "Gravixar is an AI-ops platform: portals, intake wizards, and content agents that run your operations with a human on every write. In production before you buy.",
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.url }],
  // Icons auto-detected from app/icon.png + app/apple-icon.png by
  // Next.js's file-based icons convention. Don't add an `icons`
  // override here — that points at /favicon.ico which doesn't exist
  // and was causing browsers to render a generic placeholder.
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Smooth scrolling lives in globals.css behind prefers-reduced-motion.
    // data-scroll-behavior tells Next 16 to suspend it during route changes,
    // so a navigation from a scrolled page never animates the jump to top.
    <html
      lang="en"
      className={`${geistMono.variable} ${newsreader.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <StructuredDataGlobal />
      </head>
      <body className="text-fg">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
