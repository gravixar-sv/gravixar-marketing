import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/seo";

export function Footer() {
  return (
    <footer className="border-t border-line-soft bg-[#070707]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/gravixar-avatar.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
            />
            <Image
              src="/logos/gravixar-wordmark.png"
              alt={SITE.name}
              width={120}
              height={30}
              className="h-6 w-auto"
            />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
            The AI-ops platform. It runs your operations, you approve the
            moves. Running before you sign.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-mono text-label uppercase text-brand">Site</p>
          <ul className="mt-4 space-y-2.5 text-zinc-400">
            <li><Link href="/services" className="hover:text-brand-soft">Services</Link></li>
            <li><Link href="/work" className="hover:text-brand-soft">Work</Link></li>
            {/* /compare was reachable only from the navbar's "More" dropdown
                and from nothing else on the site, which made five
                highest-commercial-intent pages effectively orphaned. */}
            <li><Link href="/compare" className="hover:text-brand-soft">Compare</Link></li>
            <li><Link href="/graphics" className="hover:text-brand-soft">Graphics</Link></li>
            <li><Link href="/blog" className="hover:text-brand-soft">Writing</Link></li>
            <li><Link href="/about" className="hover:text-brand-soft">About</Link></li>
            <li><Link href="/careers" className="hover:text-brand-soft">Careers</Link></li>
            <li><Link href="/privacy" className="hover:text-brand-soft">Privacy</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-mono text-label uppercase text-brand">Get in touch</p>
          <ul className="mt-4 space-y-2.5 text-zinc-400">
            <li><Link href="/contact" className="hover:text-brand-soft">Book a call</Link></li>
            <li>
              <a href="mailto:gravixar@gmail.com" className="hover:text-brand-soft">
                gravixar@gmail.com
              </a>
            </li>
            <li>
              <a
                href={SITE.demoUrl}
                className="hover:text-brand-soft"
                rel="noreferrer"
              >
                Try the demo
              </a>
            </li>
          </ul>
          <div className="mt-5 flex items-center gap-3" aria-label="social links">
            <a
              href="https://www.linkedin.com/in/qamarabbas/"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="text-muted transition-colors hover:text-brand-soft"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/qabbas4/"
              rel="noreferrer"
              aria-label="Instagram"
              className="text-muted transition-colors hover:text-brand-soft"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-line-soft px-6 py-6 text-xs text-muted">
        © {new Date().getFullYear()} {SITE.name}. Built by Qamar with concrete proof, not pitch decks.
      </div>
    </footer>
  );
}
