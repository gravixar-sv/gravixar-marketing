import Image from "next/image";
import Link from "next/link";
import { SetInType } from "@/components/site/SetInType";
import { PageLight } from "@/components/conversion/PageLight";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

// The 404 renders from the app root, outside the (marketing) chrome, so it has
// no header, footer or main gutter of its own. Rather than copy that chrome in
// (and drift from it), it is a composed, self-contained page: the wordmark as
// the way home, one statement, two ways forward and a quiet third, centred in
// the window with its own gutter and the same ember light the inner pages
// open under. No dead end.
export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden px-6 pb-16 pt-10 text-center md:pt-12">
      <PageLight centered className="inset-x-0 top-0 h-[36rem] md:top-0" />

      <Link href="/" aria-label="Gravixar, home" className="hero-enter inline-flex rounded-md">
        <Image
          src="/logos/gravixar-wordmark.png"
          alt="Gravixar"
          width={144}
          height={36}
          priority
          className="h-7 w-auto"
        />
      </Link>

      <div className="flex w-full max-w-xl flex-1 flex-col items-center justify-center py-16">
        {/* A status code is machine output, so it is the one mono line. */}
        <p className="hero-enter font-mono text-label text-ink-500 [animation-delay:40ms]">404</p>
        <SetInType
          as="h1"
          text="That page is not here."
          delay={80}
          className="mt-4 text-page font-semibold text-ink-50"
        />
        <p className="hero-enter mt-5 max-w-[40ch] text-lead text-ink-300 [animation-delay:260ms]">
          The link is out of date or has a typo. Everything else is where I left it.
        </p>
        <div className="hero-enter mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center [animation-delay:340ms]">
          <Link href="/" className={cn("group", buttonClass())}>
            Back to the homepage
          </Link>
          <Link href="/work" className={cn("group", buttonClass({ variant: "ghost" }))}>
            See the work <Arrow />
          </Link>
        </div>
        <p className="hero-enter mt-8 text-caption text-ink-400 [animation-delay:420ms]">
          Or start with the{" "}
          <Link href="/services/ops-leak-audit" className="link-quiet">
            Ops Leak Audit
          </Link>
          , a fixed-price first step.
        </p>
      </div>
    </main>
  );
}
