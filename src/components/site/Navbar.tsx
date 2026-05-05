import Link from "next/link";
import Image from "next/image";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/compare", label: "Compare" },
  { href: "/graphics", label: "Graphics" },
  { href: "/blog", label: "Writing" },
  { href: "/about", label: "About" },
];

export function Navbar() {
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
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-brand md:inline">
            ai-augmented ops
          </span>
        </Link>
        <nav className="hidden gap-7 text-sm text-zinc-300 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-brand-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/contact"
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-brand hover:text-brand-soft"
        >
          Book a call
        </Link>
      </div>
    </header>
  );
}
