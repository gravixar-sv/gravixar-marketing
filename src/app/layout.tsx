import type { Metadata, Viewport } from "next";
import { Geist_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SourceCapture } from "@/components/site/SourceCapture";
import { StructuredDataGlobal } from "@/components/site/StructuredData";
import { SITE } from "@/lib/seo";
import "@/styles/globals.css";

// Root layout, the bare-bones shell for every route. Marketing chrome
// (DemoBanner, Navbar, Footer, main wrapper) lives in (marketing)/layout.tsx
// so admin and other non-marketing routes don't inherit it.
//
// Three voices, one job each: Mona Sans is the brand, Geist Mono is machine
// output (URLs, timestamps, status), and Newsreader italic is the human voice,
// used for one phrase per page at most. next/font self-hosts all three.
//
// The brand face is Mona Sans Variable, latin, trimmed to what this site sets:
// weights 400 to 700 (normal, medium, semibold, and bold for **strong**) and
// widths 94% to 100% (h1/h2 and a few display numbers run at 94%). The
// package's file carries wght 200-900 and wdth 75-125 and weighed 98 KB, the
// largest thing a phone fetched before its first paint; the trimmed file is
// 56 KB. Hubot Sans was retired 2026-09-23: its capital I carries slab serifs,
// which read as a fallback glyph in every first-person heading.
//
// To use a weight or width outside those ranges, regenerate the file first or
// the browser will synthesise it. scripts/trim-brand-font.mjs says how.
//
// Served under a neutral family name: Mona Sans is OFL with the Reserved Font
// Name "Mona", and this file is a modified (trimmed) copy.
const brandSans = localFont({
  src: "../fonts/brand-sans-latin.woff2",
  variable: "--font-brand-sans",
  weight: "400 700",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "94% 100%" }],
  // The hero text on every page is set in it, so it is worth the early fetch.
  preload: true,
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  // Not preloaded: machine output (timestamps, labels) is never the first
  // thing read, and its preload competed with the brand face on a phone.
  preload: false,
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
  title: { default: `${SITE.name} · The AI-ops platform that asks before it acts`, template: `%s · ${SITE.name}` },
  description:
    "Client portals, intake forms, and AI that drafts the work, with a person approving every action before it happens. See each one running before you buy.",
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
      className={`${brandSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <StructuredDataGlobal />
      </head>
      <body className="text-fg">
        {children}
        <SourceCapture />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
