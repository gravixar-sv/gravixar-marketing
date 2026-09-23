import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/seo";

const SITE_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  // /compare was reachable only from the navbar's "More" menu, which left five
  // high-intent pages effectively orphaned. Keep it here.
  { href: "/compare", label: "Compare" },
  { href: "/graphics", label: "Graphics" },
  { href: "/blog", label: "Writing" },
  { href: "/about", label: "About" },
  { href: "/careers", label: "Careers" },
  { href: "/privacy", label: "Privacy" },
] as const;

const linkClass = "text-ink-400 transition-colors hover:text-ink-50";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line-soft bg-ink-950/50">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-10 pt-16 md:grid-cols-12 md:pt-20">
        <div className="md:col-span-6">
          <Image
            src="/logos/gravixar-wordmark.png"
            alt={SITE.name}
            width={144}
            height={36}
            className="h-7 w-auto"
          />
          <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-400">
            The AI-ops platform: it runs your operations, and you approve every
            move. See it working before you sign.
          </p>
        </div>
        <nav aria-label="Site" className="text-[0.9375rem] md:col-span-3">
          <p className="text-caption text-ink-500">Site</p>
          <ul className="mt-4 space-y-2.5">
            {SITE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-[0.9375rem] md:col-span-3">
          <p className="text-caption text-ink-500">Get in touch</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/services/ops-leak-audit" className={linkClass}>
                Ops Leak Audit
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                Book a call
              </Link>
            </li>
            <li>
              <a href="mailto:gravixar@gmail.com" className={linkClass}>
                gravixar@gmail.com
              </a>
            </li>
            <li>
              <a href={SITE.demoUrl} className={linkClass} rel="noreferrer">
                Try the demo
              </a>
            </li>
          </ul>
          <div className="mt-6 flex items-center gap-2" aria-label="Social links">
            <a
              href="https://www.linkedin.com/in/qamarabbas/"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-soft text-ink-400 transition-colors hover:border-line-strong hover:text-ink-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/qabbas4/"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-soft text-ink-400 transition-colors hover:border-line-strong hover:text-ink-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-2 border-t border-line-soft py-6 text-[0.8125rem] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Built by Qamar. Proof first, pitch second.
          </p>
          <p>Islamabad, working with teams in Pakistan and the UK.</p>
        </div>
      </div>

      {/* The closing brand moment: the wordmark set huge and cropped by the
          page edge, barely lit from below. Decorative, so aria-hidden. */}
      <div aria-hidden className="pointer-events-none relative mx-auto -mb-[3vw] max-w-[88rem] select-none px-6">
        <div className="ember-rise absolute inset-x-0 bottom-0 h-[70%] opacity-60" />
        <Image
          src="/logos/gravixar-wordmark.png"
          alt=""
          width={1440}
          height={354}
          className="relative w-full opacity-[0.06] [mask-image:linear-gradient(to_bottom,#000_20%,transparent_95%)]"
        />
      </div>
    </footer>
  );
}
