import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/seo";

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-[#070707]">
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
            Operations, people, and AI work, for teams that want the systems
            running before they sign.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand">Site</p>
          <ul className="mt-4 space-y-2.5 text-zinc-400">
            <li><Link href="/services" className="hover:text-brand-soft">Services</Link></li>
            <li><Link href="/work" className="hover:text-brand-soft">Work</Link></li>
            <li><Link href="/graphics" className="hover:text-brand-soft">Graphics</Link></li>
            <li><Link href="/blog" className="hover:text-brand-soft">Writing</Link></li>
            <li><Link href="/about" className="hover:text-brand-soft">About</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-mono text-[11px] uppercase tracking-widest text-brand">Get in touch</p>
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
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-zinc-900 px-6 py-6 text-xs text-zinc-500">
        © {new Date().getFullYear()} {SITE.name}. Built by Qamar with concrete proof, not pitch decks.
      </div>
    </footer>
  );
}
