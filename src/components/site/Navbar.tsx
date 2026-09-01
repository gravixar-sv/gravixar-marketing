"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Stack,
  Scales,
  Palette,
  NotePencil,
  CaretDown,
  List,
  X,
} from "@phosphor-icons/react";

// Top-level entries: the primary buyer flow. Three items, plus the
// "More" dropdown for secondary discovery, plus the persistent CTA.
const PRIMARY = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/demos", label: "Demos" },
] as const;

// Items folded into the More dropdown — secondary discovery surfaces.
// Each carries an icon + one-line description so the dropdown reads as
// a small menu of intentional surfaces, not a list of dump-everything links.
const MORE = [
  {
    href: "/modules",
    label: "Modules",
    description: "Reusable patterns across builds",
    Icon: Stack,
  },
  {
    href: "/compare",
    label: "Compare",
    description: "Off-the-shelf vs custom honest reads",
    Icon: Scales,
  },
  {
    href: "/graphics",
    label: "Graphics",
    description: "Visual work, labeled by origin",
    Icon: Palette,
  },
  {
    href: "/blog",
    label: "Writing",
    description: "Notes from the field, AI-drafted then approved",
    Icon: NotePencil,
  },
] as const;

// Rendered after More + before the CTA button.
const TRAILING = [{ href: "/about", label: "About" }] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close both menus on route change. Without this, the dropdown stays
  // open when a link inside it is clicked because the same DOM persists
  // across client-side navs in the App Router.
  useEffect(() => {
    setMoreOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Click-outside close for the desktop dropdown.
  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

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
            ai-ops platform
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

          {/* "More" dropdown — controlled state, click-outside + Esc close,
              auto-closes on route change. */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className={`inline-flex items-center gap-1 transition-colors ${
                moreOpen ? "text-brand-soft" : "text-zinc-300 hover:text-brand-soft"
              }`}
            >
              More
              <CaretDown
                size={14}
                weight="bold"
                className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`absolute right-0 top-full z-50 mt-3 w-80 transition-all duration-150 ${
                moreOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible -translate-y-1 opacity-0"
              }`}
              role="menu"
            >
              <div className="live-panel rounded-xl p-2">
                {MORE.map(({ href, label, description, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="group/item flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-zinc-900/60"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900/80 text-brand transition-colors group-hover/item:bg-brand/10">
                      <Icon size={16} />
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

        {/* Right side, CTA on desktop, hamburger on mobile.
            ORDER AND EMPHASIS ARE DELIBERATE and were the wrong way round
            until 2026-09-01: the brand fill sat on "Get early access", a
            waitlist for the hosted platform that /about states does not exist
            yet ("It does not exist yet and I am not printing a date for it"),
            while "Book a call", the only action that can transact today, wore
            the quiet outline. On every page of the site the loudest control
            pointed at the one thing nobody can buy. Early access keeps its
            place in the header because the list is real, but it is secondary
            until the product it lists for ships. */}
        <div className="flex items-center gap-3">
          <Link
            href="/early-access"
            className="hidden rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft md:inline-block"
          >
            Get early access
          </Link>
          <Link
            href="/contact"
            className="hidden rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft md:inline-block"
          >
            Book a call
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 transition-colors hover:border-brand hover:text-brand-soft md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <List size={18} />}
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
                <Icon size={16} className="mt-1 text-brand" />
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
            {/* Same hierarchy as desktop: the transacting CTA carries the
                fill. Kept in the same DOM order as the desktop pair so the
                two never drift apart again. */}
            <Link
              href="/early-access"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-md border border-zinc-700 px-3 py-2.5 text-center text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
            >
              Get early access
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-md bg-brand px-3 py-2.5 text-center text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-brand-soft"
            >
              Book a call
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
