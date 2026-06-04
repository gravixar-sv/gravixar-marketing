import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "@fontsource-variable/hubot-sans";
import "@fontsource-variable/mona-sans";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { StructuredDataGlobal } from "@/components/site/StructuredData";
import { SITE } from "@/lib/seo";
import "@/styles/globals.css";

// Root layout, the bare-bones shell for every route. Marketing chrome
// (DemoBanner, Navbar, Footer, main wrapper) lives in (marketing)/layout.tsx
// so admin and other non-marketing routes don't inherit it.
//
// Display + body type is Hubot Sans + Mona Sans (GitHub's open variable
// grotesks), self-hosted via @fontsource-variable and consumed by the
// Tailwind theme as --font-display / --font-sans. Mono stays Geist Mono
// (next/font self-hosts it) for field labels, numerals, and status pills.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description:
    "Gravixar is an AI-ops platform: productized modules (portals, intake wizards, content agents) that run your operations with a human approving every write. Running in production before you buy. Delivered as a hosted product or a high-touch custom build.",
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.url }],
  // Icons auto-detected from app/icon.png + app/apple-icon.png by
  // Next.js's file-based icons convention. Don't add an `icons`
  // override here — that points at /favicon.ico which doesn't exist
  // and was causing browsers to render a generic placeholder.
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
      className={`${geistMono.variable} scroll-smooth`}
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
