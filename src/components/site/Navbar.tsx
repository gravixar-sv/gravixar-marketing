"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Boxes,
  Scale,
  Palette,
  PenLine,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

// Top-level entries: the primary buyer flow. Three items, plus the
// "More" dropdown for secondary discovery, plus the persistent CTA.
const PRIMARY = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
] as const;

// Items folded into the More dropdown — secondary discovery surfaces.
// Each carries an icon + one-line description so the dropdown reads as
// a small menu of intentional surfaces, not a list of dump-everything links.
const MORE = [
  {
    href: "/modules",
    label: "Modules",
    description: "Reusable patterns across builds",
    Icon: Boxes,
  },
  {
    href: "/compare",
    label: "Compare",
    description: "Off-the-shelf vs custom honest reads",
    Icon: Scale,
  },
  {
    href: "/graphics",
    label: "Graphics",
    description: "Brand and visual portfolio",
    Icon: Palette,
  },
  {
    href: "/blog",
    label: "Writing",
    description: "Notes from the field, AI-drafted then approved",
    Icon: PenLine,
  },
] as const;

// Rendered after More + before the CTA button.
const TRAILING = [{ href: "/about", label: "About" }] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/80 bg-[#0a0a0a]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Gravixar, home">
          <Image
            src="/logos/gravixar-wordmark.png"
            alt="Gravixar"
            width={144}
            height={36}
            priority
            className="h-7 w-auto md:h-8"
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-brand md:inline">
            ai-augmented ops
          </span>
        </Link>

        {/* Desktop nav, primary + dropdown + trailing */}
        <nav className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-brand-soft"
            >
              {item.label}
            </Link>
          ))}

          {/* "More" dropdown — pure CSS hover + focus-within, keyboard accessible */}
          <div className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-zinc-300 transition-colors hover:text-brand-soft focus-visible:outline-none focus-visible:text-brand-soft"
              aria-haspopup="true"
            >
              More
              <ChevronDown
                size={14}
                className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
              />
            </button>
            <div
              className="invisible absolute right-0 top-full z-50 mt-3 w-80 -translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
              role="menu"
            >
              <div className="live-panel rounded-xl p-2">
                {MORE.map(({ href, label, description, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    className="group/item flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-zinc-900/60"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900/80 text-brand transition-colors group-hover/item:bg-brand/10">
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-zinc-100">
                        {label}
                      </span>
                      <span className="text-xs leading-snug text-zinc-500">
                        {description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {TRAILING.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-brand-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side, CTA on desktop, hamburger on mobile */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft md:inline-block"
          >
            Book a call
          </Link>
          <Link
            href="/early-access"
            className="hidden rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft md:inline-block"
          >
            Get early access
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 transition-colors hover:border-brand hover:text-brand-soft md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu, full-width drop below the bar */}
      {mobileOpen ? (
        <div className="border-t border-zinc-900/80 bg-[#0a0a0a]/95 backdrop-blur md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-6 py-4">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-brand-soft"
              >
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-zinc-900" />
            {MORE.map(({ href, label, description, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-zinc-900"
              >
                <Icon size={16} strokeWidth={1.75} className="mt-1 text-brand" />
                <span className="flex flex-col">
                  <span className="text-sm text-zinc-200">{label}</span>
                  <span className="text-xs text-zinc-500">{description}</span>
                </span>
              </Link>
            ))}
            <div className="h-px bg-zinc-900" />
            {TRAILING.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-brand-soft"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-md border border-zinc-700 px-3 py-2.5 text-center text-sm text-zinc-200"
            >
              Book a call
            </Link>
            <Link
              href="/early-access"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-md bg-brand px-3 py-2.5 text-center text-sm font-medium text-[#0a0a0a]"
            >
              Get early access
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
