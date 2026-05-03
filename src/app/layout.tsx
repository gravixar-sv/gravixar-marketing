import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { DemoBanner } from "@/components/site/DemoBanner";
import { StructuredDataGlobal } from "@/components/site/StructuredData";
import { SITE } from "@/lib/seo";
import "@/styles/globals.css";

// next/font self-hosts the font files (no Google CDN call), bakes in
// font-display: swap, subsets to latin, and emits a CSS variable that
// our Tailwind theme reads.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <StructuredDataGlobal />
      </head>
      <body className="bg-[#0a0a0a] text-[#fafafa]">
        <DemoBanner />
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-16">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
