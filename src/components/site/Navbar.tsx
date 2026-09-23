"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Stack,
  Scales,
  Palette,
  NotePencil,
  Hourglass,
  CaretDown,
} from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

// Top-level entries: the primary buyer flow, then "More" for secondary
// discovery, then About, then the two actions.
const PRIMARY = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/demos", label: "Demos" },
] as const;

const MORE = [
  { href: "/modules", label: "Modules", description: "The building blocks I reuse across builds", Icon: Stack },
  { href: "/compare", label: "Compare", description: "Off-the-shelf tools against a custom build", Icon: Scales },
  { href: "/graphics", label: "Graphics", description: "Visual work, labelled by where it came from", Icon: Palette },
  { href: "/blog", label: "Writing", description: "Notes from the work, drafted by AI, approved by me", Icon: NotePencil },
  { href: "/early-access", label: "Early access", description: "The list for the hosted version, no date promised", Icon: Hourglass },
] as const;

const TRAILING = [{ href: "/about", label: "About" }] as const;

// Long reads get a progress line along the header's bottom edge. Only routes
// whose article carries .read-track: module and graphics pages are short, and
// a line that loads a third full before anyone scrolls says nothing.
const LONG_FORM = /^\/(blog|work|compare|services)\/[^/]+$|^\/privacy$/;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const moreActive = MORE.some((m) => isActive(pathname, m.href));

  // Close both menus on route change: the same DOM persists across client
  // navigations in the App Router.
  useEffect(() => {
    setMoreOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
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

  const navLink = (href: string, label: string) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative py-1 transition-colors",
          active ? "text-ink-50" : "text-ink-300 hover:text-ink-50",
        )}
      >
        {label}
        {/* One element on the page carries the name nav-active, so the dot
            glides between items as part of the route's view transition. */}
        {active ? <span aria-hidden className="nav-dot" /> : null}
      </Link>
    );
  };

  return (
    // The header is its own view-transition group (see globals.css): held
    // still and painted above the page while <main> swaps beneath it.
    <header
      className="site-header sticky top-0 z-40 border-b border-line-soft bg-bg/95"
      style={{ viewTransitionName: "site-header" } as CSSProperties}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center" aria-label="Gravixar, home">
          <Image
            src="/logos/gravixar-wordmark.png"
            alt="Gravixar"
            width={144}
            height={36}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 text-[0.9375rem] lg:flex">
          {PRIMARY.map((item) => navLink(item.href, item.label))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className={cn(
                "relative inline-flex items-center gap-1 py-1 transition-colors",
                moreOpen || moreActive ? "text-ink-50" : "text-ink-300 hover:text-ink-50",
              )}
            >
              More
              <CaretDown
                size={13}
                weight="bold"
                className={cn("transition-transform duration-200", moreOpen && "rotate-180")}
              />
              {moreActive ? <span aria-hidden className="nav-dot" /> : null}
            </button>
            {/* Always mounted so it can exit as well as enter: in on the
                expo curve, out faster on the exit curve, growing from the
                trigger's corner. No item stagger: a menu must be instant to
                scan. */}
            <div
              role="menu"
              className={cn(
                "absolute right-0 top-full z-50 mt-4 w-[21rem] origin-top-right transition-[opacity,scale,translate,visibility]",
                moreOpen
                  ? "visible translate-y-0 scale-100 opacity-100 duration-[240ms] ease-out-expo"
                  : "invisible -translate-y-1 scale-[0.97] opacity-0 duration-150 ease-exit",
              )}
            >
              <div className="panel-lit rounded-2xl p-1.5">
                {MORE.map(({ href, label, description, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="group/item flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-50/[0.04]"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-soft bg-ink-900/70 text-ink-400 transition-colors group-hover/item:text-ink-100">
                      <Icon size={16} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-ink-100">{label}</span>
                      <span className="text-[0.8125rem] leading-snug text-ink-500">{description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {TRAILING.map((item) => navLink(item.href, item.label))}
        </nav>

        {/* The Ops Leak Audit carries the fill: a published price is a smaller
            first step for a stranger than a call. Booking keeps the outline
            (Bosun's booking answer points at this button).
            CLASS ORDER IS LOAD-BEARING: `cn` keeps the LAST conflicting class
            and buttonClass carries `inline-flex`, so the responsive `hidden`
            goes after it or both buttons render on phones. */}
        <div className="flex items-center gap-2.5">
          <Link href="/contact" className={cn(buttonClass({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}>
            Book a call
          </Link>
          {/* Quiet on every route. Every page now carries its own primary
              action, and a coral fill in a sticky header sat beside it in
              every viewport: two coral buttons, so neither read as the
              decision. Coral in the chrome is the active-route dot only. */}
          <Link
            href="/services/ops-leak-audit"
            className={cn(buttonClass({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}
          >
            Ops Leak Audit
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-200 transition-colors hover:border-line-strong lg:hidden"
          >
            {/* Two bars that fold into an X, rather than an icon swap. */}
            <span aria-hidden className="relative block h-3 w-4">
              <span
                className={cn(
                  "absolute left-0 top-0.5 block h-px w-4 bg-current transition-transform duration-300 ease-out-expo",
                  mobileOpen && "translate-y-[4.5px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0.5 left-0 block h-px w-4 bg-current transition-transform duration-300 ease-out-expo",
                  mobileOpen && "-translate-y-[4.5px] -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {LONG_FORM.test(pathname) ? <span aria-hidden className="read-progress" /> : null}

      {mobileOpen ? (
        <div className="mobile-sheet border-t border-line-soft bg-bg lg:hidden">
          <nav aria-label="Mobile" className="mx-auto max-h-[calc(100dvh-4rem)] max-w-6xl overflow-y-auto px-6 pb-6 pt-3">
            <ul className="divide-y divide-line-soft">
              {[...PRIMARY, ...TRAILING].map((item, i) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className="sheet-item" style={{ "--i": i } as CSSProperties}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between py-3.5 text-[1.375rem] font-semibold tracking-[-0.02em]",
                        active ? "text-ink-50" : "text-ink-200",
                      )}
                    >
                      {item.label}
                      {active ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
              {MORE.map(({ href, label }, i) => (
                <li key={href} className="sheet-item" style={{ "--i": i + 4 } as CSSProperties}>
                  <Link href={href} className="block py-2 text-[0.9375rem] text-ink-400 transition-colors hover:text-ink-100">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="sheet-item mt-6 grid gap-2.5" style={{ "--i": 9 } as CSSProperties}>
              <Link href="/services/ops-leak-audit" className={cn(buttonClass({ size: "lg" }), "w-full")}>
                Start with the Ops Leak Audit
              </Link>
              <Link href="/contact" className={cn(buttonClass({ variant: "ghost", size: "lg" }), "w-full")}>
                Book a call
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
