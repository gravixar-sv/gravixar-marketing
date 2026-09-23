import Link from "next/link";
import { SetInType } from "@/components/site/SetInType";
import { PageLight } from "@/components/conversion/PageLight";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

// The 404 for a miss INSIDE the marketing chrome: a [slug] route that calls
// notFound() (a removed post, a mistyped case study). The root not-found.tsx
// carries its own wordmark because it renders with no header; rendered here,
// under the real header, that stacked two wordmarks. Same statement and the
// same ways forward, without the wordmark and without claiming the full
// window height the chrome already takes.
export default function MarketingNotFound() {
  return (
    <div className="relative isolate flex flex-col items-center py-16 text-center md:py-24">
      <PageLight centered className="inset-x-0 -top-16 h-[32rem]" />
      {/* A status code is machine output, so it is the one mono line. */}
      <p className="hero-enter font-mono text-label text-ink-500">404</p>
      <SetInType
        as="h1"
        text="That page is not here."
        delay={60}
        className="mt-4 text-page font-semibold text-ink-50"
      />
      <p className="hero-enter mt-5 max-w-[40ch] text-lead text-ink-300 [animation-delay:240ms]">
        The link is out of date or has a typo. Everything else is where I left it.
      </p>
      <div className="hero-enter mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center [animation-delay:320ms]">
        <Link href="/" className={cn("group", buttonClass())}>
          Back to the homepage
        </Link>
        <Link href="/work" className={cn("group", buttonClass({ variant: "ghost" }))}>
          See the work <Arrow />
        </Link>
      </div>
      <p className="hero-enter mt-8 text-caption text-ink-400 [animation-delay:400ms]">
        Or start with the{" "}
        <Link href="/services/ops-leak-audit" className="link-quiet">
          Ops Leak Audit
        </Link>
        , a fixed-price first step.
      </p>
    </div>
  );
}
